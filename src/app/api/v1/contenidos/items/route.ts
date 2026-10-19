import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasAnyRole } from '@/lib/auth'
import { ok, created, Err } from '@/lib/api'

const CreateItemLinkSchema = z.object({
  unidad_id:    z.string().uuid(),
  tipo:         z.literal('link'),
  titulo:       z.string().min(1).max(200),
  url:          z.string().url(),
  nota:         z.string().max(1000).optional().nullable(),
  dimension_id: z.string().uuid().optional().nullable(),
  orden:        z.number().int().min(0).default(0),
})

async function resolveUnidadForInsert(unidad_id: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('unidades')
    .select('id, materia_id, institucion_id, materias(id, institucion_id, instituciones(modulo_contenidos))')
    .eq('id', unidad_id)
    .is('deleted_at', null)
    .single()
  return { supabase, unidad: data }
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const body = await request.json().catch(() => null)
  const parsed = CreateItemLinkSchema.safeParse(body)
  if (!parsed.success) return Err.validation(parsed.error.issues[0].message)

  const { unidad_id, titulo, url, nota, dimension_id, orden } = parsed.data

  const { supabase, unidad } = await resolveUnidadForInsert(unidad_id)
  if (!unidad) return Err.notFound('Unidad no encontrada')

  const materia = unidad.materias as { id: string; institucion_id: string; instituciones: { modulo_contenidos: boolean } | null } | null
  if (!materia?.instituciones?.modulo_contenidos) return Err.notFound('Módulo no habilitado')

  if (!isSuperadmin(session) && !hasAnyRole(session, materia.institucion_id, ['admin', 'docente']))
    return Err.forbidden()

  const { data, error } = await supabase
    .from('contenidos')
    .insert({
      unidad_id,
      tipo: 'link',
      titulo,
      url,
      storage_path: null,
      nota: nota ?? null,
      dimension_id: dimension_id ?? null,
      orden,
      autor_id: session.persona_id,
    })
    .select('id, tipo, titulo, url, storage_path, nota, dimension_id, orden, publicado, created_at')
    .single()

  if (error || !data) return Err.server(error?.message ?? 'Error al crear item')
  return created(data)
}

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const { searchParams } = new URL(request.url)
  const unidad_id = searchParams.get('unidad_id')
  if (!unidad_id) return Err.validation('unidad_id requerido')

  const { supabase, unidad } = await resolveUnidadForInsert(unidad_id)
  if (!unidad) return Err.notFound('Unidad no encontrada')

  const materia = unidad.materias as { id: string; institucion_id: string; instituciones: { modulo_contenidos: boolean } | null } | null
  if (!materia?.instituciones?.modulo_contenidos) return Err.notFound('Módulo no habilitado')

  if (!isSuperadmin(session) && !hasAnyRole(session, materia.institucion_id, ['admin', 'docente', 'responsable']))
    return Err.forbidden()

  const { data, error } = await supabase
    .from('contenidos')
    .select('id, tipo, titulo, url, storage_path, nota, dimension_id, orden, publicado, created_at')
    .eq('unidad_id', unidad_id)
    .is('deleted_at', null)
    .order('orden', { ascending: true })

  if (error) return Err.server(error.message)
  return ok(data)
}
