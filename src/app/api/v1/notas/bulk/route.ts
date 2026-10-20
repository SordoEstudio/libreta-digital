import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasAnyRole } from '@/lib/auth'
import { ok, Err } from '@/lib/api'
import { notificarNotaCargada } from '@/lib/notificaciones'
import { isPeriodoCerrado } from '@/lib/cierre-periodo'

const BulkSchema = z.object({
  evaluacion_id: z.string().uuid(),
  notas: z.array(z.object({
    alumno_id: z.string().uuid(),
    dimension_id: z.string().uuid().nullable().optional(),
    valor_numerico: z.number().nullable().optional(),
    valor_literal: z.string().nullable().optional(),
    observacion: z.string().optional(),
  })).min(1),
})

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return Err.unauthorized()
  if (!session.persona_id) return Err.forbidden()

  const body = await request.json().catch(() => null)
  const parsed = BulkSchema.safeParse(body)
  if (!parsed.success) return Err.validation(parsed.error.issues[0].message)

  const { evaluacion_id, notas } = parsed.data
  const supabase = await createClient()

  const { data: evaluacion } = await supabase
    .from('evaluaciones')
    .select('id, nombre, tipo, periodo_id, institucion_id, materias(materias_catalogo(nombre), cursos(nombre))')
    .eq('id', evaluacion_id)
    .is('deleted_at', null)
    .single()

  if (!evaluacion) return Err.notFound('Evaluación no encontrada')
  if (!isSuperadmin(session) && !hasAnyRole(session, evaluacion.institucion_id, ['admin', 'docente'])) return Err.forbidden()

  if (evaluacion.periodo_id) {
    const { data: periodo } = await supabase
      .from('periodos')
      .select('cerrado_at')
      .eq('id', evaluacion.periodo_id)
      .is('deleted_at', null)
      .single()
    if (isPeriodoCerrado(periodo?.cerrado_at)) return Err.conflict('Período cerrado')
  }

  const mat = evaluacion.materias as { materias_catalogo: { nombre: string } | null; cursos: { nombre: string } | null } | null

  const toUpsert = notas
    .filter(n => n.valor_numerico != null || n.valor_literal != null)
    .map(n => ({
      evaluacion_id,
      alumno_id: n.alumno_id,
      dimension_id: n.dimension_id ?? null,
      valor_numerico: n.valor_numerico ?? null,
      valor_literal: n.valor_literal ?? null,
      observacion: n.observacion,
      institucion_id: evaluacion.institucion_id,
      docente_id: session.persona_id!,
    }))

  if (toUpsert.length === 0) return ok({ upserted: 0, skipped: notas.length })

  // Validate against active scale if one exists
  const { data: escala } = await supabase
    .from('escalas')
    .select('min_valor, max_valor')
    .eq('institucion_id', evaluacion.institucion_id)
    .eq('activa', true)
    .maybeSingle()

  if (escala?.min_valor !== null && escala?.min_valor !== undefined && escala?.max_valor !== null && escala?.max_valor !== undefined) {
    const fueraDeEscala = toUpsert.find(n =>
      n.valor_numerico !== null && (n.valor_numerico < escala.min_valor! || n.valor_numerico > escala.max_valor!)
    )
    if (fueraDeEscala) {
      return Err.validation(`Nota ${fueraDeEscala.valor_numerico} fuera de escala (${escala.min_valor}–${escala.max_valor})`)
    }
  }

  const { data, error } = await supabase
    .from('notas')
    .upsert(toUpsert, { onConflict: 'evaluacion_id,dimension_id,alumno_id' })
    .select('id, alumno_id, valor_numerico, valor_literal')

  if (error) {
    if (error.code === '23505') {
      return Err.validation('Nota duplicada: ya existe una nota para ese alumno y dimensión en esta evaluación')
    }
    return Err.server(error.message)
  }

  const uniqueAlumnoIds = [...new Set(data.map(n => n.alumno_id))]
  const { data: alumnos } = await supabase
    .from('alumnos')
    .select('id, nombre')
    .in('id', uniqueAlumnoIds)

  const alumnoMap = new Map((alumnos ?? []).map(a => [a.id, a.nombre]))
  const { data: inst } = await supabase
    .from('instituciones')
    .select('nombre, logo_rectangular_url')
    .eq('id', evaluacion.institucion_id)
    .single()

  // Deduplicate notifications by alumno_id — one notif per alumno regardless of dimensions
  const notifByAlumno = new Map<string, typeof data[number]>()
  for (const nota of data) {
    if (!notifByAlumno.has(nota.alumno_id)) notifByAlumno.set(nota.alumno_id, nota)
  }

  void Promise.allSettled(
    Array.from(notifByAlumno.values()).map(nota =>
      notificarNotaCargada({
        nota_id: nota.id,
        alumno_id: nota.alumno_id,
        alumno_nombre: alumnoMap.get(nota.alumno_id) ?? 'Alumno',
        evaluacion_nombre: evaluacion.nombre,
        evaluacion_tipo: evaluacion.tipo,
        materia_nombre: (mat?.materias_catalogo as { nombre: string } | null)?.nombre ?? '',
        curso_nombre: mat?.cursos?.nombre ?? '',
        valor: (nota.valor_numerico?.toString() ?? nota.valor_literal) ?? '—',
        institucion_id: evaluacion.institucion_id,
        institucion_nombre: inst?.nombre ?? '',
        logo_url: inst?.logo_rectangular_url ?? undefined,
      })
    )
  )

  return ok({ upserted: data.length, skipped: notas.length - toUpsert.length })
}
