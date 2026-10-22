import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ok, Err } from '@/lib/api'

export async function GET(req: NextRequest) {
  const slug = new URL(req.url).searchParams.get('slug')
  if (!slug) return Err.validation('slug requerido')

  const admin = createAdminClient()
  const { data } = await admin
    .from('instituciones')
    .select('nombre, logo_cuadrado_url, logo_rectangular_url')
    .eq('slug', slug)
    .is('deleted_at', null)
    .maybeSingle()

  if (!data) return Err.notFound('Institución no encontrada')
  return ok(data)
}
