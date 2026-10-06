import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasRole, hasAnyRole } from '@/lib/auth'
import { ok, created, Err } from '@/lib/api'

const CreateSchema = z.object({
  persona_id: z.string().uuid().optional(),
  nombre: z.string().min(1),
  apellido: z.string().optional(),
  email: z.string().email().optional(),
  fecha_nacimiento: z.string().date().optional(),
  dni: z.string().optional(),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
  curso_id: z.string().uuid().optional(),
})

type Params = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  const { id: institucion_id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()
  if (!isSuperadmin(session) && !hasAnyRole(session, institucion_id, ['admin', 'docente', 'responsable']))
    return Err.forbidden()

  const sp = request.nextUrl.searchParams
  const curso_id = sp.get('curso_id')
  const q = sp.get('q')
  const activo = sp.get('activo')

  const supabase = await createClient()
  const query = supabase
    .from('alumnos')
    .select('id, nombre, apellido, email, fecha_nacimiento, dni, telefono, direccion, activo, persona_id, alumno_inscripciones(curso_id, activo, deleted_at)')
    .eq('institucion_id', institucion_id)
    .is('deleted_at', null)
    .order('apellido', { nullsFirst: false })
    .order('nombre')

  if (activo !== null && activo !== undefined) query.eq('activo', activo === 'true')
  if (q) query.or(`nombre.ilike.%${q}%,apellido.ilike.%${q}%,email.ilike.%${q}%`)

  const { data, error } = await query
  if (error) return Err.server(error.message)

  type Inscripcion = { curso_id: string; activo: boolean; deleted_at: string | null }
  let result = (data ?? []).map(a => ({
    id: a.id,
    nombre: a.nombre,
    apellido: a.apellido ?? null,
    email: a.email,
    fecha_nacimiento: a.fecha_nacimiento,
    dni: a.dni,
    telefono: a.telefono,
    direccion: a.direccion,
    activo: a.activo,
    persona_id: a.persona_id,
    curso_id: ((a.alumno_inscripciones ?? []) as Inscripcion[]).find(i => i.activo && !i.deleted_at)?.curso_id ?? null,
  }))

  if (curso_id) result = result.filter(a => a.curso_id === curso_id)

  return ok(result)
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id: institucion_id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()
  if (!isSuperadmin(session) && !hasRole(session, institucion_id, 'admin')) return Err.forbidden()

  const body = await request.json().catch(() => null)
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) return Err.validation(parsed.error.issues[0].message)

  const { curso_id, ...alumnoData } = parsed.data

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('alumnos')
    .insert({ ...alumnoData, institucion_id })
    .select('id, nombre')
    .single()

  if (error) return Err.server(error.message)

  if (curso_id) {
    await supabase.from('alumno_inscripciones').insert({
      alumno_id: data.id,
      curso_id,
      institucion_id,
      activo: true,
    })
  }

  return created(data)
}
