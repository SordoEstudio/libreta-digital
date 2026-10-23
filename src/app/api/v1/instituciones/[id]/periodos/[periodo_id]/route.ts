import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasRole } from '@/lib/auth'
import { ok, Err } from '@/lib/api'

const PatchSchema = z.object({
  nombre: z.string().min(1).max(100),
}).strict()

type Params = { params: Promise<{ id: string; periodo_id: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id: institucion_id, periodo_id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()
  if (!isSuperadmin(session) && !hasRole(session, institucion_id, 'admin')) return Err.forbidden()

  const body = await request.json().catch(() => null)
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) return Err.validation(parsed.error.issues[0].message)

  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('periodos')
    .select('tipo')
    .eq('id', periodo_id)
    .eq('institucion_id', institucion_id)
    .is('deleted_at', null)
    .single()
  if (!existing) return Err.notFound('Período no encontrado')
  if (existing.tipo === 'anual') return Err.conflict('El período anual no se puede renombrar')

  const { data, error } = await supabase
    .from('periodos')
    .update({ nombre: parsed.data.nombre })
    .eq('id', periodo_id)
    .eq('institucion_id', institucion_id)
    .is('deleted_at', null)
    .select('id, nombre')
    .single()

  if (error) return Err.server(error.message)
  return ok(data)
}
