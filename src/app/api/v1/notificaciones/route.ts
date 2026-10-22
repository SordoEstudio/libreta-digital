import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth'
import { ok, Err } from '@/lib/api'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return Err.unauthorized()
  if (!session.persona_id) return Err.forbidden()

  const leido = request.nextUrl.searchParams.get('leido')
  const offset = Math.max(0, parseInt(request.nextUrl.searchParams.get('offset') ?? '0', 10) || 0)
  const limit = 50
  const supabase = await createClient()

  let query = supabase
    .from('notificaciones')
    .select('id, tipo, titulo, contenido, leido, created_at, metadata')
    .eq('persona_id', session.persona_id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (leido !== null) query = query.eq('leido', leido === 'true')

  const { data, error } = await query
  if (error) return Err.server(error.message)

  const { count: sin_leer } = await supabase
    .from('notificaciones')
    .select('id', { count: 'exact', head: true })
    .eq('persona_id', session.persona_id)
    .eq('leido', false)

  return ok(data, { sin_leer: sin_leer ?? 0, has_more: (data?.length ?? 0) === limit })
}
