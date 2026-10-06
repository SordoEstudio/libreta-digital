import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSession, isSuperadmin, hasRole } from '@/lib/auth'
import { ok, Err } from '@/lib/api'

const PatchSchema = z.object({
  rol: z.enum(['admin', 'docente', 'responsable']).optional(),
  nombre: z.string().min(1).optional(),
  apellido: z.string().nullable().optional(),
  telefono: z.string().nullable().optional(),
  dni: z.string().nullable().optional(),
  direccion: z.string().nullable().optional(),
  activo: z.boolean().optional(),
}).strict()

type Params = { params: Promise<{ id: string; persona_id: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id: institucion_id, persona_id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()
  if (!isSuperadmin(session) && !hasRole(session, institucion_id, 'admin')) return Err.forbidden()

  const body = await request.json().catch(() => null)
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) return Err.validation(parsed.error.issues[0].message)

  const { rol, activo, ...personaData } = parsed.data
  const supabase = await createClient()
  const admin = createAdminClient()

  if (rol !== undefined || activo !== undefined) {
    const { error } = await supabase
      .from('memberships')
      .update({ ...(rol !== undefined && { rol }), ...(activo !== undefined && { activo }) })
      .eq('persona_id', persona_id)
      .eq('institucion_id', institucion_id)
    if (error) return Err.server(error.message)
  }

  if (Object.keys(personaData).length > 0) {
    const { error } = await admin
      .from('personas')
      .update(personaData)
      .eq('id', persona_id)
    if (error) return Err.server(error.message)
  }

  const { data, error } = await admin
    .from('memberships')
    .select('rol, personas(id, nombre, email)')
    .eq('persona_id', persona_id)
    .eq('institucion_id', institucion_id)
    .single()

  if (error) return Err.server(error.message)
  return ok(data)
}
