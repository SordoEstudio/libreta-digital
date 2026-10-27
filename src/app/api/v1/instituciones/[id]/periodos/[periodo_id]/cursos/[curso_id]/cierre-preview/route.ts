import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasRole } from '@/lib/auth'
import { ok, Err } from '@/lib/api'
import { buildCierrePreview } from '@/lib/cierre-periodo'

type Params = { params: Promise<{ id: string; periodo_id: string; curso_id: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  const { id: institucion_id, periodo_id, curso_id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()
  if (!isSuperadmin(session) && !hasRole(session, institucion_id, 'admin')) return Err.forbidden()

  const supabase = await createClient()

  const { data: periodo, error: periodoErr } = await supabase
    .from('periodos')
    .select('id')
    .eq('id', periodo_id)
    .eq('institucion_id', institucion_id)
    .is('deleted_at', null)
    .single()
  if (periodoErr || !periodo) return Err.notFound('Período no encontrado')

  const { data: cursoRaw, error: cursoErr } = await supabase
    .from('cursos')
    .select('id, nombre')
    .eq('id', curso_id)
    .is('deleted_at', null)
    .single()
  if (cursoErr || !cursoRaw) return Err.notFound('Curso no encontrado')
  const curso = cursoRaw as { id: string; nombre: string }

  const { data: materiasRaw } = await supabase
    .from('materias')
    .select('id, curso_id, materias_catalogo(nombre)')
    .eq('curso_id', curso_id)
    .is('deleted_at', null)

  const materias = (materiasRaw ?? []).map(m => ({
    id: m.id,
    curso_id: m.curso_id,
    curso_nombre: curso.nombre,
    nombre: (m.materias_catalogo as { nombre: string } | null)?.nombre ?? '',
  }))

  const materiaIds = materias.map(m => m.id)

  const { data: inscRaw } = await supabase
    .from('alumno_inscripciones')
    .select('alumno_id, curso_id, alumnos(id, nombre, apellido)')
    .eq('curso_id', curso_id)
    .eq('activo', true)
    .is('deleted_at', null)

  const alumnosMap = new Map<string, { id: string; nombre: string; apellido: string | null }>()
  const inscripciones: Array<{ alumno_id: string; materia_id: string; curso_id: string }> = []

  for (const insc of inscRaw ?? []) {
    const alumno = insc.alumnos as { id: string; nombre: string; apellido: string | null } | null
    if (!alumno) continue
    alumnosMap.set(alumno.id, alumno)
    for (const mat of materias) {
      inscripciones.push({ alumno_id: alumno.id, materia_id: mat.id, curso_id: curso_id })
    }
  }

  const alumnos = Array.from(alumnosMap.values())

  const { data: evals } = await supabase
    .from('evaluaciones')
    .select('materia_id')
    .eq('periodo_id', periodo_id)
    .in('materia_id', materiaIds.length > 0 ? materiaIds : ['__none__'])
    .is('deleted_at', null)

  const evaluacionesPorMateria = new Map<string, true>()
  for (const ev of evals ?? []) evaluacionesPorMateria.set(ev.materia_id, true)

  const notasExistentes = new Set<string>()
  if ((evals ?? []).length > 0) {
    const { data: notasData } = await supabase
      .from('notas')
      .select('alumno_id, evaluaciones!inner(materia_id, periodo_id)')
      .eq('evaluaciones.periodo_id', periodo_id)
      .is('deleted_at', null)

    for (const nota of notasData ?? []) {
      const ev = nota.evaluaciones as { materia_id: string; periodo_id: string } | null
      if (ev && materiaIds.includes(ev.materia_id)) {
        notasExistentes.add(`${nota.alumno_id}:${ev.materia_id}`)
      }
    }
  }

  const { data: asistRaw } = await supabase
    .from('asistencia_resumen')
    .select('materia_id')
    .eq('periodo_id', periodo_id)
    .in('materia_id', materiaIds.length > 0 ? materiaIds : ['__none__'])

  const asistenciaExistente = new Set<string>()
  for (const ar of asistRaw ?? []) {
    if (ar.materia_id) asistenciaExistente.add(ar.materia_id)
  }

  const preview = buildCierrePreview({
    alumnos,
    materias,
    inscripciones,
    evaluacionesPorMateria,
    notasExistentes,
    asistenciaExistente,
  })

  return ok(preview)
}
