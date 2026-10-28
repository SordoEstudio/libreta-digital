import { NextRequest } from 'next/server'
import { z } from 'zod'
import { zId } from '@/lib/validators'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasRole, hasAnyRole } from '@/lib/auth'
import { ok, created, Err } from '@/lib/api'

const CreateSchema = z.object({
  año_lectivo_id: zId(),
  nombre: z.string().min(1),
  nivel: z.string().optional(),
  turno: z.enum(['mañana', 'tarde', 'noche']).optional(),
  escala_id: zId().optional(),
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
    .from('cursos')
    .select('id, nombre, nivel, turno, escala_id, año_lectivo_id')
    .eq('institucion_id', institucion_id)
    .eq('año_lectivo_id', año_lectivo_id)
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

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cursos')
    .insert({ ...parsed.data, institucion_id })
    .select('id, nombre')
    .single()

  if (error) return Err.server(error.message)
  return created(data)
}
