import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasRole, hasAnyRole } from '@/lib/auth'
import { ok, created, Err } from '@/lib/api'

const CreateSchema = z.object({
  año_lectivo_id: z.string().uuid(),
  nombre: z.string().min(1),
  orden: z.number().int().positive().default(1),
  tipo: z.enum(['regular', 'anual']).default('regular'),
  fecha_inicio: z.string().date().optional(),
  fecha_fin: z.string().date().optional(),
})

type Params = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  const { id: institucion_id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()
  if (!isSuperadmin(session) && !hasAnyRole(session, institucion_id, ['admin', 'docente', 'responsable']))
    return Err.forbidden()

  const año_lectivo_id = request.nextUrl.searchParams.get('año_lectivo_id')
  if (!año_lectivo_id) return Err.validation('año_lectivo_id es requerido')

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('periodos')
    .select('id, nombre, orden, fecha_inicio, fecha_fin')
    .eq('institucion_id', institucion_id)
    .eq('año_lectivo_id', año_lectivo_id)
    .is('deleted_at', null)
    .order('orden')

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

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('periodos')
    .insert({ ...parsed.data, institucion_id })
    .select('id, nombre, orden')
    .single()

  if (error) return Err.server(error.message)
  return created(data)
}
