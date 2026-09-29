import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasRole, hasAnyRole } from '@/lib/auth'
import { ok, created, Err } from '@/lib/api'

const CreateSchema = z.object({
  nombre: z.string().min(1),
  fecha_inicio: z.string().date().optional(),
  fecha_fin: z.string().date().optional(),
  activo: z.boolean().default(false),
})

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id: institucion_id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()
  if (!isSuperadmin(session) && !hasAnyRole(session, institucion_id, ['admin', 'docente', 'responsable']))
    return Err.forbidden()

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('años_lectivos')
    .select('id, nombre, fecha_inicio, fecha_fin, activo')
    .eq('institucion_id', institucion_id)
    .is('deleted_at', null)
    .order('nombre', { ascending: false })

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

  if (parsed.data.activo) {
    await supabase
      .from('años_lectivos')
      .update({ activo: false })
      .eq('institucion_id', institucion_id)
      .eq('activo', true)
  }

  const { data, error } = await supabase
    .from('años_lectivos')
    .insert({ ...parsed.data, institucion_id })
    .select('id, nombre, activo')
    .single()

  if (error) return Err.server(error.message)
  return created(data)
}
