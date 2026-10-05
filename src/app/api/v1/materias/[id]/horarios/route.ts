import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasRole, hasAnyRole } from '@/lib/auth'
import { ok, created, Err } from '@/lib/api'

const CreateSchema = z.object({
  dia_semana:  z.number().int().min(1).max(7),
  hora_inicio: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM requerido'),
  hora_fin:    z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM requerido'),
  aula:        z.string().max(50).optional(),
})

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id: materia_id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const supabase = await createClient()
  const { data: materia } = await supabase
    .from('materias')
    .select('institucion_id')
    .eq('id', materia_id)
    .is('deleted_at', null)
    .single()

  if (!materia) return Err.notFound()
  if (!isSuperadmin(session) && !hasAnyRole(session, materia.institucion_id, ['admin', 'docente', 'responsable']))
    return Err.forbidden()

  const { data, error } = await supabase
    .from('materia_horarios')
    .select('id, dia_semana, hora_inicio, hora_fin, aula')
    .eq('materia_id', materia_id)
    .is('deleted_at', null)
    .order('dia_semana')
    .order('hora_inicio')

  if (error) return Err.server(error.message)
  return ok(data)
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id: materia_id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const supabase = await createClient()
  const { data: materia } = await supabase
    .from('materias')
    .select('institucion_id')
    .eq('id', materia_id)
    .is('deleted_at', null)
    .single()

  if (!materia) return Err.notFound()
  if (!isSuperadmin(session) && !hasRole(session, materia.institucion_id, 'admin')) return Err.forbidden()

  const body = await request.json().catch(() => null)
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) return Err.validation(parsed.error.issues[0].message)

  if (parsed.data.hora_fin <= parsed.data.hora_inicio)
    return Err.validation('La hora de fin debe ser posterior a la de inicio')

  const { data, error } = await supabase
    .from('materia_horarios')
    .insert({ materia_id, institucion_id: materia.institucion_id, ...parsed.data })
    .select('id, dia_semana, hora_inicio, hora_fin, aula')
    .single()

  if (error) return Err.server(error.message)
  return created(data)
}
