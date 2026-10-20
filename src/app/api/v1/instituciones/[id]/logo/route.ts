import { NextRequest } from 'next/server'
import { getSession, isSuperadmin, hasRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ok, Err } from '@/lib/api'

type Params = { params: Promise<{ id: string }> }

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
const MAX_BYTES = 2 * 1024 * 1024

export async function POST(req: NextRequest, { params }: Params) {
  const { id: instId } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()

  if (!isSuperadmin(session) && !hasRole(session, instId, 'admin'))
    return Err.forbidden()

  const form = await req.formData().catch(() => null)
  if (!form) return Err.validation('FormData inválido')

  const tipo = form.get('tipo')
  const file = form.get('file')

  if (tipo !== 'cuadrado' && tipo !== 'rectangular')
    return Err.validation('tipo debe ser cuadrado o rectangular')
  if (!(file instanceof File)) return Err.validation('archivo requerido')
  if (!ALLOWED_TYPES.includes(file.type)) return Err.validation('Formato no soportado (PNG, JPG, WebP, SVG)')
  if (file.size > MAX_BYTES) return Err.validation('Tamaño máximo 2 MB')

  const ext = file.type === 'image/svg+xml' ? 'svg'
    : file.type === 'image/png' ? 'png'
    : file.type === 'image/webp' ? 'webp'
    : 'jpg'

  const path = `${instId}/${tipo}.${ext}`
  const bytes = await file.arrayBuffer()

  const admin = createAdminClient()
  const { error: uploadError } = await admin.storage
    .from('institution-logos')
    .upload(path, bytes, { contentType: file.type, upsert: true })

  if (uploadError) return Err.server(uploadError.message)

  const { data: { publicUrl } } = admin.storage
    .from('institution-logos')
    .getPublicUrl(path)

  // Append cache-bust so UI refreshes immediately after re-upload
  const urlWithBust = `${publicUrl}?t=${Date.now()}`

  const supabase = await createClient()
  const updatePayload = tipo === 'cuadrado'
    ? { logo_cuadrado_url: urlWithBust }
    : { logo_rectangular_url: urlWithBust }
  const { error: updateError } = await supabase
    .from('instituciones')
    .update(updatePayload)
    .eq('id', instId)

  if (updateError) return Err.server(updateError.message)

  return ok({ url: urlWithBust })
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id: instId } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()

  if (!isSuperadmin(session) && !hasRole(session, instId, 'admin'))
    return Err.forbidden()

  const { searchParams } = new URL(req.url)
  const tipo = searchParams.get('tipo')
  if (tipo !== 'cuadrado' && tipo !== 'rectangular')
    return Err.validation('tipo debe ser cuadrado o rectangular')

  const admin = createAdminClient()

  // Remove file from storage (try all extensions)
  for (const ext of ['png', 'jpg', 'webp', 'svg']) {
    await admin.storage.from('institution-logos').remove([`${instId}/${tipo}.${ext}`])
  }

  const supabase = await createClient()
  const nullPayload = tipo === 'cuadrado'
    ? { logo_cuadrado_url: null }
    : { logo_rectangular_url: null }
  const { error } = await supabase
    .from('instituciones')
    .update(nullPayload)
    .eq('id', instId)

  if (error) return Err.server(error.message)
  return ok({ removed: true })
}
