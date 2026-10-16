import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasRole } from '@/lib/auth'
import { ok, Err } from '@/lib/api'

const PatchSchema = z.object({
  nombre: z.string().min(1).optional(),
  apellido: z.string().nullable().optional(),
  email: z.string().email().optional(),
  fecha_nacimiento: z.string().date().optional().nullable(),
  dni: z.string().nullable().optional(),
  telefono: z.string().nullable().optional(),
  direccion: z.string().nullable().optional(),
  activo: z.boolean().optional(),
}).strict()

// For changing course, use POST /api/v1/alumnos/[id]/inscripciones

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const supabase = await createClient()
  const { data } = await supabase
    .from('alumnos')
    .select('id, nombre, apellido, fecha_nacimiento, dni, telefono, direccion, activo, institucion_id')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!data) return Err.notFound()
  if (!isSuperadmin(session) && !hasRole(session, data.institucion_id, 'admin')) return Err.forbidden()
  return ok(data)
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const supabase = await createClient()
  const { data: alumno } = await supabase
    .from('alumnos')
    .select('institucion_id')
    .eq('id', id)
    .single()

  if (!alumno) return Err.notFound()
  if (!isSuperadmin(session) && !hasRole(session, alumno.institucion_id, 'admin')) return Err.forbidden()

  const body = await request.json().catch(() => null)
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) return Err.validation(parsed.error.issues[0].message)

  const { data, error } = await supabase
    .from('alumnos')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error) return Err.server(error.message)
  return ok(data)
}
