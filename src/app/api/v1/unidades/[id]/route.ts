import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasAnyRole } from '@/lib/auth'
import { ok, Err } from '@/lib/api'
import { SupabaseClient } from '@supabase/supabase-js'

const PatchSchema = z.object({
  nombre:       z.string().min(1).optional(),
  descripcion:  z.string().nullable().optional(),
  orden:        z.number().int().optional(),
  fecha_inicio: z.string().nullable().optional(),
  fecha_fin:    z.string().nullable().optional(),
})

type Params = { params: Promise<{ id: string }> }

async function resolveUnidad(supabase: SupabaseClient, id: string) {
  const { data } = await supabase
    .from('unidades')
    .select('id, materia_id, institucion_id')
    .eq('id', id)
    .is('deleted_at', null)
    .single()
  return data
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const supabase = await createClient()
  const unidad = await resolveUnidad(supabase, id)
  if (!unidad) return Err.notFound('Unidad no encontrada')
  if (!isSuperadmin(session) && !hasAnyRole(session, unidad.institucion_id, ['admin', 'docente']))
    return Err.forbidden()

  const body = await request.json().catch(() => null)
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) return Err.validation(parsed.error.issues[0].message)

  if (Object.keys(parsed.data).length === 0)
    return Err.validation('No hay campos para actualizar')

  const { data, error } = await supabase
    .from('unidades')
    .update(parsed.data)
    .eq('id', id)
    .is('deleted_at', null)
    .select('id, nombre, descripcion, orden, fecha_inicio, fecha_fin')
    .single()

  if (error) return Err.server(error.message)
  return ok(data)
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const supabase = await createClient()
  const unidad = await resolveUnidad(supabase, id)
  if (!unidad) return Err.notFound('Unidad no encontrada')
  if (!isSuperadmin(session) && !hasAnyRole(session, unidad.institucion_id, ['admin', 'docente']))
    return Err.forbidden()

  // Clean up junction rows before soft-delete (ON DELETE CASCADE only applies to hard-delete)
  const { error: euError } = await supabase
    .from('evaluacion_unidades')
    .delete()
    .eq('unidad_id', id)

  if (euError) return Err.server(euError.message)

  const { error: eruError } = await supabase
    .from('evaluacion_referencia_unidades')
    .delete()
    .eq('unidad_id', id)

  if (eruError) return Err.server(eruError.message)

  const { error } = await supabase
    .from('unidades')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return Err.server(error.message)
  return ok({ deleted: true })
}
