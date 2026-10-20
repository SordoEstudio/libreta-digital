import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { ok, Err } from '@/lib/api'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const slug = new URL(req.url).searchParams.get('slug')
  if (!slug) return Err.validation('slug requerido')

  const supabase = await createClient()
  const { data } = await supabase
    .from('instituciones')
    .select('id, nombre, logo_cuadrado_url, logo_rectangular_url')
    .eq('slug', slug)
    .is('deleted_at', null)
    .maybeSingle()

  if (!data) return Err.notFound('Institución no encontrada')
  return ok(data)
}
