import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasAnyRole } from '@/lib/auth'
import { ok, Err } from '@/lib/api'

type Params = { params: Promise<{ plantilla_id: string }> }

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { plantilla_id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const supabase = await createClient()
  const { data: plantilla } = await supabase
    .from('dimension_plantillas')
    .select('id, institucion_id')
    .eq('id', plantilla_id)
    .is('deleted_at', null)
    .single()

  if (!plantilla) return Err.notFound('Plantilla no encontrada')
  if (!isSuperadmin(session) && !hasAnyRole(session, plantilla.institucion_id, ['admin']))
    return Err.forbidden()

  const { error } = await supabase
    .from('dimension_plantillas')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', plantilla_id)

  if (error) return Err.server(error.message)

  return ok({ id: plantilla_id })
}
