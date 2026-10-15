import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasAnyRole } from '@/lib/auth'
import { ok, created, Err } from '@/lib/api'

const CreateSchema = z.object({
  nombre: z.string().min(1).max(100),
  peso:   z.number().nonnegative().nullable().optional(),
  orden:  z.number().int().positive().optional(),
}).strict()

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
  if (!isSuperadmin(session) && !hasAnyRole(session, materia.institucion_id, ['admin', 'docente', 'responsable']))
    return Err.forbidden()

  const { data, error } = await supabase
    .from('materias_dimensiones')
    .select('id, nombre, peso, orden')
    .eq('materia_id', materia_id)
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
  if (!isSuperadmin(session) && !hasAnyRole(session, materia.institucion_id, ['admin']))
    return Err.forbidden()

  const body = await request.json().catch(() => null)
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) return Err.validation(parsed.error.issues[0].message)

  let orden = parsed.data.orden
  if (orden === undefined) {
    const { data: max } = await supabase
      .from('materias_dimensiones')
      .select('orden')
      .eq('materia_id', materia_id)
      .order('orden', { ascending: false })
      .limit(1)
      .maybeSingle()
    orden = (max?.orden ?? 0) + 1
  }

  const pesoValue = parsed.data.peso && parsed.data.peso > 0 ? parsed.data.peso : null

  const { data, error } = await supabase
    .from('materias_dimensiones')
    .insert({ materia_id, nombre: parsed.data.nombre, peso: pesoValue, orden })
    .select('id, nombre, peso, orden')
    .single()

  if (error) return Err.server(error.message)
  return created(data)
}
