import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSession, isSuperadmin, hasAnyRole } from '@/lib/auth'
import { Err } from '@/lib/api'

type Params = { params: Promise<{ id: string }> }

// Signed URL TTL: 3600s (1 hora) — suficiente para una sesión normal
const SIGNED_URL_TTL = 3600

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const supabase = await createClient()
  const { data: item } = await supabase
    .from('contenidos')
    .select('id, storage_path, unidad_id, unidades_contenido(id, materia_id, materias(id, institucion_id))')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!item) return Err.notFound('Item no encontrado')
  if (!item.storage_path) return Err.validation('Este item no tiene archivo adjunto')

  const unidad = item.unidades_contenido as { id: string; materia_id: string; materias: { id: string; institucion_id: string } | null } | null
  const materia = unidad?.materias
  if (!materia) return Err.notFound('Materia no encontrada')

  // Allow staff + responsable (responsable can download publicado items via RLS; check role here)
  if (!isSuperadmin(session) && !hasAnyRole(session, materia.institucion_id, ['admin', 'docente', 'responsable']))
    return Err.forbidden()

  const adminClient = createAdminClient()
  const { data: signed, error } = await adminClient.storage
    .from('contenidos')
    .createSignedUrl(item.storage_path, SIGNED_URL_TTL)

  if (error || !signed?.signedUrl) return Err.server(error?.message ?? 'No se pudo generar URL')

  return NextResponse.redirect(signed.signedUrl)
}
