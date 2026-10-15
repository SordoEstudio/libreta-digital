import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasAnyRole } from '@/lib/auth'
import { ok, Err } from '@/lib/api'
import { AplicarPlantillaSchema } from '@/lib/dimension-plantillas'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  const { id: materia_id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const supabase = await createClient()
  const { data: materia } = await supabase
    .from('materias')
    .select('id, institucion_id')
    .eq('id', materia_id)
    .is('deleted_at', null)
    .single()

  if (!materia) return Err.notFound('Materia no encontrada')
  if (!isSuperadmin(session) && !hasAnyRole(session, materia.institucion_id, ['admin']))
    return Err.forbidden()

  const body = await request.json().catch(() => null)
  const parsed = AplicarPlantillaSchema.safeParse(body)
  if (!parsed.success) return Err.validation(parsed.error.issues[0].message)

  const { plantilla_id } = parsed.data

  const { data: plantilla } = await supabase
    .from('dimension_plantillas')
    .select('id, dimension_plantilla_items(id, nombre, peso, orden)')
    .eq('id', plantilla_id)
    .eq('institucion_id', materia.institucion_id)
    .is('deleted_at', null)
    .single()

  if (!plantilla) return Err.notFound('Plantilla no encontrada para esta institución')

  await supabase
    .from('materias_dimensiones')
    .delete()
    .eq('materia_id', materia_id)

  const items = (plantilla.dimension_plantilla_items ?? []) as Array<{ nombre: string; peso: number | null; orden: number }>
  if (items.length === 0) return ok({ dimensiones_creadas: 0 })

  const toInsert = items
    .sort((a, b) => a.orden - b.orden)
    .map(item => ({
      materia_id,
      nombre: item.nombre,
      peso: item.peso,
      orden: item.orden,
    }))

  const { error, data: inserted } = await supabase
    .from('materias_dimensiones')
    .insert(toInsert)
    .select('id')

  if (error) return Err.server(error.message)

  return ok({ dimensiones_creadas: inserted?.length ?? 0 })
}
