import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasRole } from '@/lib/auth'
import { ok, Err } from '@/lib/api'

type Params = { params: Promise<{ id: string; periodo_id: string }> }

export async function POST(_request: NextRequest, { params }: Params) {
  const { id: institucion_id, periodo_id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()
  if (!isSuperadmin(session) && !hasRole(session, institucion_id, 'admin')) return Err.forbidden()

  const supabase = await createClient()

  const { data: periodo, error: periodoErr } = await supabase
    .from('periodos')
    .select('id')
    .eq('id', periodo_id)
    .eq('institucion_id', institucion_id)
    .is('deleted_at', null)
    .single()
  if (periodoErr || !periodo) return Err.notFound('Período no encontrado')

  const { error: updateErr } = await supabase
    .from('periodos')
    .update({ cerrado_at: null, cerrado_por: null })
    .eq('id', periodo_id)
  if (updateErr) return Err.server(updateErr.message)

  return ok({ reabierto: true })
}
