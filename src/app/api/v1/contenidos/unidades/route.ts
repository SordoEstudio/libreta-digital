import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasAnyRole } from '@/lib/auth'
import { ok, created, Err } from '@/lib/api'

const CreateUnidadSchema = z.object({
  materia_id:  z.string().uuid(),
  nombre:      z.string().min(1).max(120),
  descripcion: z.string().max(500).optional().nullable(),
  orden:       z.number().int().min(0).default(0),
})

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const body = await request.json().catch(() => null)
  const parsed = CreateUnidadSchema.safeParse(body)
  if (!parsed.success) return Err.validation(parsed.error.issues[0].message)

  const { materia_id, nombre, descripcion, orden } = parsed.data

  const supabase = await createClient()

  const { data: materia } = await supabase
    .from('materias')
    .select('id, institucion_id, instituciones(modulo_contenidos)')
    .eq('id', materia_id)
    .is('deleted_at', null)
    .single()

  if (!materia) return Err.notFound('Materia no encontrada')

  const inst = materia.instituciones as { modulo_contenidos: boolean } | null
  if (!inst?.modulo_contenidos) return Err.notFound('Módulo no habilitado')

  if (!isSuperadmin(session) && !hasAnyRole(session, materia.institucion_id, ['admin', 'docente']))
    return Err.forbidden()

  const { data, error } = await supabase
    .from('unidades')
    .insert({
      materia_id,
      institucion_id: materia.institucion_id,
      nombre,
      descripcion: descripcion ?? null,
      orden,
    })
    .select('id, nombre, descripcion, orden, publicado, created_at')
    .single()

  if (error || !data) return Err.server(error?.message ?? 'Error al crear unidad')
  return created(data)
}

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const { searchParams } = new URL(request.url)
  const materia_id = searchParams.get('materia_id')
  if (!materia_id) return Err.validation('materia_id requerido')

  const supabase = await createClient()

  const { data: materia } = await supabase
    .from('materias')
    .select('id, institucion_id, instituciones(modulo_contenidos)')
    .eq('id', materia_id)
    .is('deleted_at', null)
    .single()

  if (!materia) return Err.notFound('Materia no encontrada')

  const inst = materia.instituciones as { modulo_contenidos: boolean } | null
  if (!inst?.modulo_contenidos) return Err.notFound('Módulo no habilitado')

  if (!isSuperadmin(session) && !hasAnyRole(session, materia.institucion_id, ['admin', 'docente', 'responsable']))
    return Err.forbidden()

  const { data, error } = await supabase
    .from('unidades')
    .select('id, nombre, descripcion, orden, publicado, created_at')
    .eq('materia_id', materia_id)
    .is('deleted_at', null)
    .order('orden', { ascending: true })

  if (error) return Err.server(error.message)
  return ok(data)
}
