import { NextRequest } from 'next/server'
import { z } from 'zod'
import { zId } from '@/lib/validators'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasAnyRole } from '@/lib/auth'
import { ok, Err } from '@/lib/api'
import { logActividad } from '@/lib/actividad'
import { isCerradoParaCurso, PeriodoCierreOverride } from '@/lib/cierre-periodo'

const BulkSchema = z.object({
  evaluacion_id: zId(),
  notas: z.array(z.object({
    alumno_id: zId(),
    dimension_id: zId().nullable().optional(),
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
    .select('id, nombre, tipo, periodo_id, institucion_id, materias(materias_catalogo(nombre), cursos(id, nombre))')
    .eq('id', evaluacion_id)
    .is('deleted_at', null)
    .single()

  if (!evaluacion) return Err.notFound('Evaluación no encontrada')
  if (!isSuperadmin(session) && !hasAnyRole(session, evaluacion.institucion_id, ['admin', 'docente'])) return Err.forbidden()

  const mat = evaluacion.materias as { materias_catalogo: { nombre: string } | null; cursos: { id: string; nombre: string } | null } | null

  if (evaluacion.periodo_id) {
    const { data: periodo } = await supabase
      .from('periodos')
      .select('cerrado_at')
      .eq('id', evaluacion.periodo_id)
      .is('deleted_at', null)
      .single()
    const curso_id = (mat?.cursos as { id: string } | null)?.id ?? null
    const { data: cierreOverride } = curso_id
      ? await supabase
          .from('periodo_cierre_cursos')
          .select('cerrado_at, publicado_at, abierto_at')
          .eq('periodo_id', evaluacion.periodo_id)
          .eq('curso_id', curso_id)
          .maybeSingle()
      : { data: null as PeriodoCierreOverride }
    if (isCerradoParaCurso(periodo?.cerrado_at ?? null, cierreOverride)) return Err.conflict('Período cerrado')
  }

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

  await logActividad({
    institucion_id: evaluacion.institucion_id,
    persona_id: session.persona_id,
    accion: 'cargar_notas',
    entidad: 'evaluaciones',
    entidad_id: evaluacion_id,
    metadata: {
      evaluacion_nombre: evaluacion.nombre,
      materia_nombre: (mat?.materias_catalogo as { nombre: string } | null)?.nombre ?? '',
      curso_nombre: mat?.cursos?.nombre ?? '',
      count: data.length,
    },
  })

  return ok({ upserted: data.length, skipped: notas.length - toUpsert.length })
}
