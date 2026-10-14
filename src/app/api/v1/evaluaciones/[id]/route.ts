import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasAnyRole } from '@/lib/auth'
import { ok, Err } from '@/lib/api'

const PatchSchema = z.object({
  nombre: z.string().min(1).optional(),
  tipo: z.enum(['parcial', 'final', 'recuperatorio', 'tp', 'concepto']).optional(),
  peso: z.number().positive().optional(),
  orden: z.number().int().positive().optional(),
  periodo_id: z.string().uuid().nullable().optional(),
  fecha: z.string().date().nullable().optional(),
  permite_recuperatorio: z.boolean().optional(),
  dimension_id: z.string().uuid().nullable().optional(),
}).strict()

type Params = { params: Promise<{ id: string }> }

async function resolveEvaluacion(id: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('evaluaciones')
    .select('id, materia_id, materias(institucion_id)')
    .eq('id', id)
    .is('deleted_at', null)
    .single()
  return { supabase, evaluacion: data }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const { supabase, evaluacion } = await resolveEvaluacion(id)
  if (!evaluacion) return Err.notFound()

  const mat = evaluacion.materias as { institucion_id: string } | null
  if (!mat) return Err.notFound()
  if (!isSuperadmin(session) && !hasAnyRole(session, mat.institucion_id, ['admin', 'docente']))
    return Err.forbidden()

  const body = await request.json().catch(() => null)
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) return Err.validation(parsed.error.issues[0].message)

  const { fecha, dimension_id, ...rest } = parsed.data
  const updateData: Record<string, unknown> = { ...rest }
  if (fecha !== undefined) updateData.fecha = fecha
  if (dimension_id !== undefined) updateData.dimension_id = dimension_id

  if (Object.keys(updateData).length === 0) return ok({ id })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase
    .from('evaluaciones')
    .update(updateData as any)
    .eq('id', id)
    .select('id, nombre, tipo, peso, orden, periodo_id, fecha')
    .single()

  if (error) return Err.server(error.message)
  return ok(data)
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const { supabase, evaluacion } = await resolveEvaluacion(id)
  if (!evaluacion) return Err.notFound()

  const mat = evaluacion.materias as { institucion_id: string } | null
  if (!mat) return Err.notFound()
  if (!isSuperadmin(session) && !hasAnyRole(session, mat.institucion_id, ['admin', 'docente']))
    return Err.forbidden()

  // Cascade: soft-delete notas first
  await supabase
    .from('notas')
    .update({ deleted_at: new Date().toISOString() })
    .eq('evaluacion_id', id)
    .is('deleted_at', null)

  const { error } = await supabase
    .from('evaluaciones')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return Err.server(error.message)
  return ok({ deleted: true })
}
