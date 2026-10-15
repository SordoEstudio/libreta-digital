import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasAnyRole } from '@/lib/auth'
import { ok, Err } from '@/lib/api'
import { AplicarPlantillaSchema } from '@/lib/dimension-plantillas'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  const { id: curso_id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const supabase = await createClient()
  const { data: curso } = await supabase
    .from('cursos')
    .select('id, institucion_id')
    .eq('id', curso_id)
    .is('deleted_at', null)
    .single()

  if (!curso) return Err.notFound('Curso no encontrado')
  if (!isSuperadmin(session) && !hasAnyRole(session, curso.institucion_id, ['admin']))
    return Err.forbidden()

  const body = await request.json().catch(() => null)
  const parsed = AplicarPlantillaSchema.safeParse(body)
  if (!parsed.success) return Err.validation(parsed.error.issues[0].message)

  const { plantilla_id } = parsed.data

  const { data: count, error } = await supabase.rpc('aplicar_plantilla_a_curso', {
    p_curso_id: curso_id,
    p_plantilla_id: plantilla_id,
    p_institucion_id: curso.institucion_id,
  })

  if (error) {
    if (error.message.includes('plantilla_not_found')) return Err.notFound('Plantilla no encontrada para esta institución')
    return Err.server(error.message)
  }

  return ok({ materias_actualizadas: count ?? 0 })
}
