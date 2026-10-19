import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasAnyRole } from '@/lib/auth'
import { ok, noContent, Err } from '@/lib/api'

const UpdateUnidadSchema = z.object({
  nombre:      z.string().min(1).max(120).optional(),
  descripcion: z.string().max(500).nullable().optional(),
  publicado:   z.boolean().optional(),
  orden:       z.number().int().min(0).optional(),
})

type Params = { params: Promise<{ id: string }> }

async function resolveUnidad(id: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('unidades')
    .select('id, materia_id, institucion_id, materias(id, instituciones(modulo_contenidos))')
    .eq('id', id)
    .is('deleted_at', null)
    .single()
  return { supabase, unidad: data }
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const body = await request.json().catch(() => null)
  const parsed = UpdateUnidadSchema.safeParse(body)
  if (!parsed.success) return Err.validation(parsed.error.issues[0].message)

  const { supabase, unidad } = await resolveUnidad(id)
  if (!unidad) return Err.notFound('Unidad no encontrada')

  const materia = unidad.materias as { id: string; instituciones: { modulo_contenidos: boolean } | null } | null
  if (!materia?.instituciones?.modulo_contenidos) return Err.notFound('Módulo no habilitado')

  if (!isSuperadmin(session) && !hasAnyRole(session, unidad.institucion_id, ['admin', 'docente']))
    return Err.forbidden()

  const updates: {
    nombre?: string
    descripcion?: string | null
    publicado?: boolean
    orden?: number
  } = {}
  if (parsed.data.nombre !== undefined) updates.nombre = parsed.data.nombre
  if (parsed.data.descripcion !== undefined) updates.descripcion = parsed.data.descripcion
  if (parsed.data.publicado !== undefined) updates.publicado = parsed.data.publicado
  if (parsed.data.orden !== undefined) updates.orden = parsed.data.orden

  const { data, error } = await supabase
    .from('unidades')
    .update(updates)
    .eq('id', id)
    .select('id, nombre, descripcion, orden, publicado')
    .single()

  if (error || !data) return Err.server(error?.message ?? 'Error al actualizar')
  return ok(data)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const { supabase, unidad } = await resolveUnidad(id)
  if (!unidad) return Err.notFound('Unidad no encontrada')

  const materia = unidad.materias as { id: string; instituciones: { modulo_contenidos: boolean } | null } | null
  if (!materia) return Err.notFound('Materia no encontrada')

  if (!isSuperadmin(session) && !hasAnyRole(session, unidad.institucion_id, ['admin', 'docente']))
    return Err.forbidden()

  // Clean up cuaderno junction rows before soft-delete
  await supabase.from('evaluacion_unidades').delete().eq('unidad_id', id)
  await supabase.from('evaluacion_referencia_unidades').delete().eq('unidad_id', id)

  const { error } = await supabase
    .from('unidades')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return Err.server(error.message)
  return noContent()
}
