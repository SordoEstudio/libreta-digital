import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasAnyRole } from '@/lib/auth'
import { ok, created, Err } from '@/lib/api'

const CreateSchema = z.object({
  nombre:       z.string().min(1),
  descripcion:  z.string().optional(),
  orden:        z.number().int().optional().default(1),
  fecha_inicio: z.string().nullable().optional(),
  fecha_fin:    z.string().nullable().optional(),
})

type Params = { params: Promise<{ id: string }> }

async function resolveMateria(id: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('materias')
    .select('id, institucion_id')
    .eq('id', id)
    .is('deleted_at', null)
    .single()
  return { supabase, materia: data }
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { id: materia_id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const { supabase, materia } = await resolveMateria(materia_id)
  if (!materia) return Err.notFound('Materia no encontrada')
  if (!isSuperadmin(session) && !hasAnyRole(session, materia.institucion_id, ['admin', 'docente']))
    return Err.forbidden()

  const { data, error } = await supabase
    .from('unidades')
    .select('id, nombre, descripcion, orden, fecha_inicio, fecha_fin')
    .eq('materia_id', materia_id)
    .is('deleted_at', null)
    .order('orden', { ascending: true })

  if (error) return Err.server(error.message)
  return ok(data)
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id: materia_id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const { supabase, materia } = await resolveMateria(materia_id)
  if (!materia) return Err.notFound('Materia no encontrada')
  if (!isSuperadmin(session) && !hasAnyRole(session, materia.institucion_id, ['admin', 'docente']))
    return Err.forbidden()

  const body = await request.json().catch(() => null)
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) return Err.validation(parsed.error.issues[0].message)

  const { data, error } = await supabase
    .from('unidades')
    .insert({
      materia_id,
      institucion_id: materia.institucion_id,
      nombre:         parsed.data.nombre,
      descripcion:    parsed.data.descripcion ?? null,
      orden:          parsed.data.orden,
      fecha_inicio:   parsed.data.fecha_inicio ?? null,
      fecha_fin:      parsed.data.fecha_fin ?? null,
    })
    .select('id, nombre, descripcion, orden, fecha_inicio, fecha_fin')
    .single()

  if (error) return Err.server(error.message)
  return created(data)
}
