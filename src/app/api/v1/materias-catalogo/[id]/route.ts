import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasRole } from '@/lib/auth'
import { ok, noContent, Err } from '@/lib/api'

const PatchSchema = z.object({
  nombre: z.string().min(1),
}).strict()

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const supabase = await createClient()
  const { data: entry } = await supabase
    .from('materias_catalogo')
    .select('id, institucion_id')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!entry) return Err.notFound()
  if (!isSuperadmin(session) && !hasRole(session, entry.institucion_id, 'admin')) return Err.forbidden()

  const body = await request.json().catch(() => null)
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) return Err.validation(parsed.error.issues[0].message)

  const { data, error } = await supabase
    .from('materias_catalogo')
    .update({ nombre: parsed.data.nombre })
    .eq('id', id)
    .select('id, nombre')
    .single()

  if (error) return Err.server(error.message)
  return ok(data)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const supabase = await createClient()
  const { data: entry } = await supabase
    .from('materias_catalogo')
    .select('id, institucion_id')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!entry) return Err.notFound()
  if (!isSuperadmin(session) && !hasRole(session, entry.institucion_id, 'admin')) return Err.forbidden()

  const { count } = await supabase
    .from('materias')
    .select('id', { count: 'exact', head: true })
    .eq('catalogo_id', id)
    .is('deleted_at', null)

  if ((count ?? 0) > 0)
    return Err.conflict('La materia tiene instancias activas en cursos. Eliminá esas instancias primero.')

  const { error } = await supabase
    .from('materias_catalogo')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return Err.server(error.message)
  return noContent()
}
