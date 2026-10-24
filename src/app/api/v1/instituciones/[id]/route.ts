import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasRole } from '@/lib/auth'
import { ok, noContent, Err } from '@/lib/api'

const PatchSchema = z.object({
  nombre: z.string().min(3).optional(),
  tipo: z.enum(['escuela_primaria', 'escuela_secundaria', 'academia', 'instituto', 'club', 'otro']).optional(),
  direccion: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email().optional(),
  logo_url: z.string().url().optional(),
  termino_recuperatorio: z.string().min(1).optional(),
}).strict()

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()
  if (!isSuperadmin(session) && !hasRole(session, id, 'admin')) return Err.forbidden()

  const body = await request.json().catch(() => null)
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) return Err.validation(parsed.error.issues[0].message)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('instituciones')
    .update(parsed.data)
    .eq('id', id)
    .is('deleted_at', null)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') return Err.notFound()
    return Err.server(error.message)
  }
  return ok(data)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()
  if (!isSuperadmin(session)) return Err.forbidden()

  const supabase = await createClient()
  const { error } = await supabase
    .from('instituciones')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null)

  if (error) return Err.server(error.message)
  return noContent()
}
