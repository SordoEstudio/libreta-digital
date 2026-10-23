import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasRole } from '@/lib/auth'
import { ok, Err } from '@/lib/api'

type Params = { params: Promise<{ id: string; ano_id: string }> }

export async function POST(_request: NextRequest, { params }: Params) {
  const { id: institucion_id, ano_id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()
  if (!isSuperadmin(session) && !hasRole(session, institucion_id, 'admin')) return Err.forbidden()

  const supabase = await createClient()

  const { data: año, error: añoErr } = await supabase
    .from('años_lectivos')
    .select('id, cerrado_at')
    .eq('id', ano_id)
    .eq('institucion_id', institucion_id)
    .is('deleted_at', null)
    .single()
  if (añoErr || !año) return Err.notFound('Año lectivo no encontrado')
  if (año.cerrado_at) return Err.conflict('El año ya está cerrado')

  const now = new Date().toISOString()

  const { error } = await supabase
    .from('años_lectivos')
    .update({ cerrado_at: now })
    .eq('id', ano_id)
  if (error) return Err.server(error.message)

  return ok({ cerrado: true })
}
