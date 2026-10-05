import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasRole } from '@/lib/auth'
import { ok, Err } from '@/lib/api'

type Params = { params: Promise<{ id: string; horario_id: string }> }

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id: materia_id, horario_id } = await params
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

  const { error } = await supabase
    .from('materia_horarios')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', horario_id)
    .eq('materia_id', materia_id)
    .is('deleted_at', null)

  if (error) return Err.server(error.message)
  return ok({ deleted: true })
}
