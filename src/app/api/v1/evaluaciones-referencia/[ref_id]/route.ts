import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasAnyRole } from '@/lib/auth'
import { ok, Err } from '@/lib/api'
import { SupabaseClient } from '@supabase/supabase-js'

const PatchSchema = z.object({
  nombre: z.string().min(1).max(200).optional(),
  tipo: z.enum(['numerica', 'conceptual']).optional(),
  fecha: z.string().date().nullable().optional(),
}).strict()

type Params = { params: Promise<{ ref_id: string }> }

async function resolveEvRef(supabase: SupabaseClient, ref_id: string) {
  const { data } = await supabase
    .from('evaluaciones_referencia')
    .select('id, materia_id, institucion_id')
    .eq('id', ref_id)
    .is('deleted_at', null)
    .single()
  return data
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { ref_id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const supabase = await createClient()
  const evRef = await resolveEvRef(supabase, ref_id)
  if (!evRef) return Err.notFound('Evaluación de referencia no encontrada')
  if (!isSuperadmin(session) && !hasAnyRole(session, evRef.institucion_id, ['admin', 'docente']))
    return Err.forbidden()

  const body = await request.json().catch(() => null)
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) return Err.validation(parsed.error.issues[0].message)

  const updateData: { nombre?: string; tipo?: string; fecha?: string | null } = {}
  if (parsed.data.nombre !== undefined) updateData.nombre = parsed.data.nombre
  if (parsed.data.tipo !== undefined) updateData.tipo = parsed.data.tipo
  if (parsed.data.fecha !== undefined) updateData.fecha = parsed.data.fecha

  if (Object.keys(updateData).length === 0) return Err.validation('No hay campos para actualizar')

  const { data, error } = await supabase
    .from('evaluaciones_referencia')
    .update(updateData)
    .eq('id', ref_id)
    .select('id, nombre, tipo, fecha')
    .single()

  if (error) return Err.server(error.message)
  return ok(data)
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { ref_id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const supabase = await createClient()
  const evRef = await resolveEvRef(supabase, ref_id)
  if (!evRef) return Err.notFound('Evaluación de referencia no encontrada')
  if (!isSuperadmin(session) && !hasAnyRole(session, evRef.institucion_id, ['admin', 'docente']))
    return Err.forbidden()

  const { error } = await supabase
    .from('evaluaciones_referencia')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', ref_id)

  if (error) return Err.server(error.message)
  return ok({ deleted: true })
}
