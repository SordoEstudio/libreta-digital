import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasRole } from '@/lib/auth'
import { ok, created, Err } from '@/lib/api'

const CreateSchema = z.object({
  nombre: z.string().min(1),
}).strict()

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id: institucion_id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()
  if (!isSuperadmin(session) && !hasRole(session, institucion_id, 'admin')) return Err.forbidden()

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('materias_catalogo')
    .select('id, nombre')
    .eq('institucion_id', institucion_id)
    .is('deleted_at', null)
    .order('nombre')

  if (error) return Err.server(error.message)
  return ok(data)
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id: institucion_id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()
  if (!isSuperadmin(session) && !hasRole(session, institucion_id, 'admin')) return Err.forbidden()

  const body = await request.json().catch(() => null)
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) return Err.validation(parsed.error.issues[0].message)

  const { nombre } = parsed.data
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('materias_catalogo')
    .select('id')
    .eq('institucion_id', institucion_id)
    .ilike('nombre', nombre)
    .is('deleted_at', null)
    .single()

  if (existing) return Err.conflict('Ya existe una materia con ese nombre')

  const { data, error } = await supabase
    .from('materias_catalogo')
    .insert({ nombre, institucion_id })
    .select('id, nombre')
    .single()

  if (error) return Err.server(error.message)
  return created(data)
}
