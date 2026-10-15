import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasAnyRole } from '@/lib/auth'
import { ok, Err } from '@/lib/api'

const BulkRefSchema = z.object({
  evaluacion_ref_id: z.string().uuid(),
  notas: z.array(z.object({
    alumno_id: z.string().uuid(),
    valor_numerico: z.number().nullable().optional(),
    valor_literal: z.string().nullable().optional(),
    observacion: z.string().optional(),
  })).min(1),
}).strict()

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return Err.unauthorized()
  if (!session.persona_id) return Err.forbidden()

  const body = await request.json().catch(() => null)
  const parsed = BulkRefSchema.safeParse(body)
  if (!parsed.success) return Err.validation(parsed.error.issues[0].message)

  const { evaluacion_ref_id, notas } = parsed.data
  const supabase = await createClient()

  const { data: evRef } = await supabase
    .from('evaluaciones_referencia')
    .select('institucion_id, materia_id, materias(curso_id)')
    .eq('id', evaluacion_ref_id)
    .is('deleted_at', null)
    .single()

  if (!evRef) return Err.notFound('Evaluación de referencia no encontrada')
  if (!isSuperadmin(session) && !hasAnyRole(session, evRef.institucion_id, ['admin', 'docente']))
    return Err.forbidden()

  const cursoId = (evRef.materias as { curso_id: string } | null)?.curso_id
  if (!cursoId) return Err.notFound('Materia sin curso asignado')

  const { data: inscripciones } = await supabase
    .from('alumno_inscripciones')
    .select('alumno_id')
    .eq('curso_id', cursoId)
    .eq('activo', true)
    .is('deleted_at', null)

  const alumnoIdsValidos = new Set((inscripciones ?? []).map(i => i.alumno_id))

  const toUpsert = notas
    .filter(n => alumnoIdsValidos.has(n.alumno_id) && (n.valor_numerico != null || n.valor_literal != null))
    .map(n => ({
      evaluacion_ref_id,
      alumno_id: n.alumno_id,
      institucion_id: evRef.institucion_id,
      valor_numerico: n.valor_numerico ?? null,
      valor_literal: n.valor_literal ?? null,
      observacion: n.observacion ?? null,
      docente_id: session.persona_id!,
    }))

  if (toUpsert.length === 0) return ok({ upserted: 0, skipped: notas.length })

  const { error } = await supabase
    .from('notas_referencia')
    .upsert(toUpsert, { onConflict: 'evaluacion_ref_id,alumno_id' })

  if (error) return Err.server(error.message)
  return ok({ upserted: toUpsert.length, skipped: notas.length - toUpsert.length })
}
