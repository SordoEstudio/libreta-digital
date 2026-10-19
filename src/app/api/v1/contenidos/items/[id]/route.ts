import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasAnyRole } from '@/lib/auth'
import { ok, noContent, Err } from '@/lib/api'

const UpdateItemSchema = z.object({
  titulo:       z.string().min(1).max(200).optional(),
  url:          z.string().url().optional().nullable(),
  nota:         z.string().max(1000).optional().nullable(),
  dimension_id: z.string().uuid().optional().nullable(),
  publicado:    z.boolean().optional(),
  orden:        z.number().int().min(0).optional(),
})

type Params = { params: Promise<{ id: string }> }

async function resolveItem(id: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('contenidos')
    .select('id, tipo, storage_path, unidad_id, unidades(id, materia_id, institucion_id, materias(id, institucion_id))')
    .eq('id', id)
    .is('deleted_at', null)
    .single()
  return { supabase, item: data }
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const body = await request.json().catch(() => null)
  const parsed = UpdateItemSchema.safeParse(body)
  if (!parsed.success) return Err.validation(parsed.error.issues[0].message)

  const { supabase, item } = await resolveItem(id)
  if (!item) return Err.notFound('Item no encontrado')

  const unidad = item.unidades as { id: string; materia_id: string; institucion_id: string; materias: { id: string; institucion_id: string } | null } | null
  if (!unidad) return Err.notFound('Unidad no encontrada')

  if (!isSuperadmin(session) && !hasAnyRole(session, unidad.institucion_id, ['admin', 'docente']))
    return Err.forbidden()

  const updates: {
    updated_at: string
    titulo?: string
    url?: string | null
    nota?: string | null
    dimension_id?: string | null
    publicado?: boolean
    orden?: number
  } = { updated_at: new Date().toISOString() }

  if (parsed.data.titulo !== undefined) updates.titulo = parsed.data.titulo
  if (parsed.data.url !== undefined) updates.url = parsed.data.url
  if (parsed.data.nota !== undefined) updates.nota = parsed.data.nota
  if (parsed.data.dimension_id !== undefined) updates.dimension_id = parsed.data.dimension_id
  if (parsed.data.publicado !== undefined) updates.publicado = parsed.data.publicado
  if (parsed.data.orden !== undefined) updates.orden = parsed.data.orden

  const { data, error } = await supabase
    .from('contenidos')
    .update(updates)
    .eq('id', id)
    .select('id, tipo, titulo, url, storage_path, nota, dimension_id, orden, publicado')
    .single()

  if (error || !data) return Err.server(error?.message ?? 'Error al actualizar')
  return ok(data)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const { supabase, item } = await resolveItem(id)
  if (!item) return Err.notFound('Item no encontrado')

  const unidad = item.unidades as { id: string; materia_id: string; institucion_id: string; materias: { id: string; institucion_id: string } | null } | null
  if (!unidad) return Err.notFound('Unidad no encontrada')

  if (!isSuperadmin(session) && !hasAnyRole(session, unidad.institucion_id, ['admin', 'docente']))
    return Err.forbidden()

  const { error } = await supabase
    .from('contenidos')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return Err.server(error.message)
  return noContent()
}
