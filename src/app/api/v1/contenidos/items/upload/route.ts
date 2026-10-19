import { NextRequest } from 'next/server'
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSession, isSuperadmin, hasAnyRole } from '@/lib/auth'
import { created, Err } from '@/lib/api'

const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
])

const MAX_SIZE = 10_485_760 // 10 MB

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return Err.unauthorized()

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return Err.validation('Formato de datos inválido')
  }

  const unidad_id = formData.get('unidad_id')
  const titulo    = formData.get('titulo')
  const nota      = formData.get('nota') ?? null
  const dimension_id = formData.get('dimension_id') ?? null
  const orden_raw = formData.get('orden')
  const file      = formData.get('file')

  if (typeof unidad_id !== 'string' || !unidad_id) return Err.validation('unidad_id requerido')
  if (typeof titulo !== 'string' || !titulo.trim()) return Err.validation('titulo requerido')
  if (!(file instanceof Blob)) return Err.validation('file requerido')

  const contentType = file.type
  if (!ALLOWED_MIME.has(contentType)) return Err.validation('Tipo de archivo no permitido')
  if (file.size > MAX_SIZE) return Err.validation('Archivo supera 10 MB')

  const orden = orden_raw ? parseInt(String(orden_raw), 10) : 0

  // Resolve unidad → materia → inst
  const supabase = await createClient()
  const { data: unidad } = await supabase
    .from('unidades')
    .select('id, materia_id, institucion_id, materias(id, institucion_id, instituciones(modulo_contenidos))')
    .eq('id', unidad_id)
    .is('deleted_at', null)
    .single()

  if (!unidad) return Err.notFound('Unidad no encontrada')

  const materia = unidad.materias as { id: string; institucion_id: string; instituciones: { modulo_contenidos: boolean } | null } | null
  if (!materia?.instituciones?.modulo_contenidos) return Err.notFound('Módulo no habilitado')

  if (!isSuperadmin(session) && !hasAnyRole(session, materia.institucion_id, ['admin', 'docente']))
    return Err.forbidden()

  // Build storage path: {inst_id}/{materia_id}/{unidad_id}/{uuid}-{sanitized_filename}
  const originalName = (file as File).name ?? 'archivo'
  const safeFilename = originalName.replace(/[^a-z0-9._-]/gi, '_')
  const storagePath = `${materia.institucion_id}/${materia.id}/${unidad_id}/${randomUUID()}-${safeFilename}`

  const buffer = Buffer.from(await file.arrayBuffer())
  const adminClient = createAdminClient()

  const { error: uploadError } = await adminClient.storage
    .from('contenidos')
    .upload(storagePath, buffer, { contentType, upsert: false })

  if (uploadError) return Err.server(uploadError.message)

  const tipo = contentType.startsWith('image/') ? 'imagen' : 'archivo'

  const { data: item, error: insertError } = await supabase
    .from('contenidos')
    .insert({
      unidad_id,
      tipo,
      titulo: titulo.trim(),
      url: null,
      storage_path: storagePath,
      nota: typeof nota === 'string' ? nota : null,
      dimension_id: typeof dimension_id === 'string' && dimension_id ? dimension_id : null,
      orden,
      autor_id: session.persona_id,
    })
    .select('id, tipo, titulo, url, storage_path, nota, dimension_id, orden, publicado, created_at')
    .single()

  if (insertError || !item) {
    // best-effort cleanup; ignore cleanup error
    await adminClient.storage.from('contenidos').remove([storagePath])
    return Err.server(insertError?.message ?? 'Error al guardar item')
  }

  return created(item)
}
