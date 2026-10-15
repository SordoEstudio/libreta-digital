import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasRole } from '@/lib/auth'
import { ok, Err } from '@/lib/api'
import { buildCierrePreview } from '@/lib/cierre-periodo'

type Params = { params: Promise<{ id: string; periodo_id: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  const { id: institucion_id, periodo_id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()
  if (!isSuperadmin(session) && !hasRole(session, institucion_id, 'admin')) return Err.forbidden()

  const supabase = await createClient()

  const { data: periodoRaw, error: periodoErr } = await supabase
    .from('periodos')
    .select('*')
    .eq('id', periodo_id)
    .eq('institucion_id', institucion_id)
    .is('deleted_at', null)
    .single()
  if (periodoErr || !periodoRaw) return Err.notFound('Período no encontrado')
  const periodo = periodoRaw as { id: string; año_lectivo_id: string }

  const { data: cursos } = await supabase
    .from('cursos')
    .select('id')
    .eq('año_lectivo_id', periodo.año_lectivo_id)
    .is('deleted_at', null)
  const cursoIds = (cursos ?? []).map(c => c.id)

  if (cursoIds.length === 0) {
    return ok(buildCierrePreview({ alumnos: [], materias: [], inscripciones: [], evaluacionesPorMateria: new Map(), notasExistentes: new Set(), asistenciaExistente: new Set() }))
  }

  const { data: materiasRaw } = await supabase
    .from('materias')
    .select('id, curso_id, materias_catalogo(nombre)')
    .in('curso_id', cursoIds)
    .is('deleted_at', null)

  const materias = (materiasRaw ?? []).map(m => ({
    id: m.id,
    curso_id: m.curso_id,
    nombre: (m.materias_catalogo as { nombre: string } | null)?.nombre ?? '',
  }))

  const materiasByCurso = new Map<string, string[]>()
  for (const mat of materias) {
    const arr = materiasByCurso.get(mat.curso_id) ?? []
    arr.push(mat.id)
    materiasByCurso.set(mat.curso_id, arr)
  }

  const { data: inscRaw } = await supabase
    .from('alumno_inscripciones')
    .select('alumno_id, curso_id, alumnos(id, nombre)')
    .in('curso_id', cursoIds)
    .eq('activo', true)
    .is('deleted_at', null)

  const alumnosMap = new Map<string, string>()
  const inscripciones: Array<{ alumno_id: string; materia_id: string }> = []

  for (const insc of inscRaw ?? []) {
    const alumno = insc.alumnos as { id: string; nombre: string } | null
    if (!alumno) continue
    alumnosMap.set(alumno.id, alumno.nombre)
    const materiasDelCurso = materiasByCurso.get(insc.curso_id) ?? []
    for (const matId of materiasDelCurso) {
      inscripciones.push({ alumno_id: alumno.id, materia_id: matId })
    }
  }

  const alumnos = Array.from(alumnosMap.entries()).map(([id, nombre]) => ({ id, nombre }))

  const { data: evals } = await supabase
    .from('evaluaciones')
    .select('materia_id')
    .eq('periodo_id', periodo_id)
    .is('deleted_at', null)

  const evaluacionesPorMateria = new Map<string, true>()
  for (const ev of evals ?? []) {
    evaluacionesPorMateria.set(ev.materia_id, true)
  }

  const notasExistentes = new Set<string>()
  if ((evals ?? []).length > 0) {
    const { data: notasData } = await supabase
      .from('notas')
      .select('alumno_id, evaluaciones!inner(materia_id, periodo_id)')
      .eq('evaluaciones.periodo_id', periodo_id)
      .is('deleted_at', null)

    for (const nota of notasData ?? []) {
      const ev = nota.evaluaciones as { materia_id: string; periodo_id: string } | null
      if (ev) notasExistentes.add(`${nota.alumno_id}:${ev.materia_id}`)
    }
  }

  const { data: asistRaw } = await supabase
    .from('asistencia_resumen')
    .select('materia_id')
    .eq('periodo_id', periodo_id)
    .gt('total_clases', 0)

  const asistenciaExistente = new Set<string>()
  for (const ar of asistRaw ?? []) {
    if (ar.materia_id) asistenciaExistente.add(ar.materia_id)
  }

  const preview = buildCierrePreview({
    alumnos,
    materias: materias.map(m => ({ id: m.id, nombre: m.nombre })),
    inscripciones,
    evaluacionesPorMateria,
    notasExistentes,
    asistenciaExistente,
  })

  return ok(preview)
}
