import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasAnyRole } from '@/lib/auth'
import { ok, Err } from '@/lib/api'

type Params = { params: Promise<{ plantilla_id: string }> }

export async function POST(_req: Request, { params }: Params) {
  const { plantilla_id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const supabase = await createClient()
  const { data: plantilla } = await supabase
    .from('dimension_plantillas')
    .select('id, institucion_id')
    .eq('id', plantilla_id)
    .is('deleted_at', null)
    .single()

  if (!plantilla) return Err.notFound('Plantilla no encontrada')
  if (!isSuperadmin(session) && !hasAnyRole(session, plantilla.institucion_id, ['admin']))
    return Err.forbidden()

  const { data: cursos } = await supabase
    .from('cursos')
    .select('id')
    .eq('institucion_id', plantilla.institucion_id)
    .is('deleted_at', null)

  let total = 0
  for (const curso of cursos ?? []) {
    const { data: count, error } = await supabase.rpc('aplicar_plantilla_a_curso', {
      p_curso_id: curso.id,
      p_plantilla_id: plantilla_id,
      p_institucion_id: plantilla.institucion_id,
    })
    if (!error && typeof count === 'number') total += count
  }

  return ok({ materias_actualizadas: total })
}
