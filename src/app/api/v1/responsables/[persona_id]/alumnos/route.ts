import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin } from '@/lib/auth'
import { ok, Err } from '@/lib/api'

type Params = { params: Promise<{ persona_id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { persona_id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()

  if (!isSuperadmin(session) && session.persona_id !== persona_id) return Err.forbidden()

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('alumno_responsables')
    .select('alumnos(id, nombre, activo, institucion_id)')
    .eq('persona_id', persona_id)
    .is('deleted_at', null)

  if (error) return Err.server(error.message)
  const alumnos = data.map(r => r.alumnos).filter(Boolean)
  return ok(alumnos)
}
