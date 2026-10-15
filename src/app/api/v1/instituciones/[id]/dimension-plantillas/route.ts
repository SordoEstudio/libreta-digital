import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasAnyRole } from '@/lib/auth'
import { ok, created, Err } from '@/lib/api'
import { CreatePlantillaSchema } from '@/lib/dimension-plantillas'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id: inst_id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()
  if (!isSuperadmin(session) && !hasAnyRole(session, inst_id, ['admin', 'docente']))
    return Err.forbidden()

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('dimension_plantillas')
    .select('id, nombre, created_at, dimension_plantilla_items(id, nombre, peso, orden)')
    .eq('institucion_id', inst_id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) return Err.server(error.message)

  const mapped = (data ?? []).map(p => ({
    id: p.id,
    nombre: p.nombre,
    created_at: p.created_at,
    items: ((p.dimension_plantilla_items ?? []) as Array<{ id: string; nombre: string; peso: number | null; orden: number }>)
      .sort((a, b) => a.orden - b.orden),
  }))

  return ok(mapped)
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id: inst_id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()
  if (!isSuperadmin(session) && !hasAnyRole(session, inst_id, ['admin']))
    return Err.forbidden()

  const supabase = await createClient()
  const { data: inst } = await supabase
    .from('instituciones')
    .select('id')
    .eq('id', inst_id)
    .is('deleted_at', null)
    .single()
  if (!inst) return Err.notFound()

  const body = await request.json().catch(() => null)
  const parsed = CreatePlantillaSchema.safeParse(body)
  if (!parsed.success) return Err.validation(parsed.error.issues[0].message)

  const { nombre, items } = parsed.data

  const { data: plantilla, error: pErr } = await supabase
    .from('dimension_plantillas')
    .insert({ institucion_id: inst_id, nombre })
    .select('id, nombre, created_at')
    .single()

  if (pErr || !plantilla) return Err.server(pErr?.message ?? 'Error al crear plantilla')

  const itemsToInsert = items.map((item, idx) => ({
    plantilla_id: plantilla.id,
    nombre: item.nombre,
    peso: item.peso ?? null,
    orden: idx + 1,
  }))

  const { data: createdItems, error: iErr } = await supabase
    .from('dimension_plantilla_items')
    .insert(itemsToInsert)
    .select('id, nombre, peso, orden')

  if (iErr) return Err.server(iErr.message)

  return created({ ...plantilla, items: (createdItems ?? []).sort((a, b) => a.orden - b.orden) })
}
