import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasRole } from '@/lib/auth'
import { ok, Err } from '@/lib/api'

const PatchSchema = z.object({
  nombre: z.string().min(1).optional(),
  activo: z.boolean().optional(),
  fecha_inicio: z.string().date().nullable().optional(),
  fecha_fin: z.string().date().nullable().optional(),
}).strict()

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const supabase = await createClient()
  const { data: año } = await supabase
    .from('años_lectivos')
    .select('institucion_id')
    .eq('id', id)
    .single()

  if (!año) return Err.notFound()
  if (!isSuperadmin(session) && !hasRole(session, año.institucion_id, 'admin')) return Err.forbidden()

  const body = await request.json().catch(() => null)
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) return Err.validation(parsed.error.issues[0].message)

  if (parsed.data.activo === true) {
    await supabase
      .from('años_lectivos')
      .update({ activo: false })
      .eq('institucion_id', año.institucion_id)
      .eq('activo', true)
  }

  const { data, error } = await supabase
    .from('años_lectivos')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error) return Err.server(error.message)
  return ok(data)
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const supabase = await createClient()
  const { data: año } = await supabase
    .from('años_lectivos')
    .select('institucion_id, activo')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!año) return Err.notFound()
  if (!isSuperadmin(session) && !hasRole(session, año.institucion_id, 'admin')) return Err.forbidden()
  if (año.activo) return Err.validation('No se puede eliminar el año lectivo activo. Activá otro primero.')

  // Guard: block if year has courses (which would cascade-delete grades)
  const { count } = await supabase
    .from('cursos')
    .select('id', { count: 'exact', head: true })
    .eq('año_lectivo_id', id)
    .is('deleted_at', null)

  if ((count ?? 0) > 0) return Err.validation('El año tiene cursos asociados. Eliminá los cursos primero.')

  const { error } = await supabase
    .from('años_lectivos')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return Err.server(error.message)
  return ok({ deleted: true })
}
