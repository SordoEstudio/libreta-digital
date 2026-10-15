import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasAnyRole } from '@/lib/auth'
import { ok, Err } from '@/lib/api'

const PatchSchema = z.object({
  nombre: z.string().min(1).max(100).optional(),
  peso:   z.number().nonnegative().nullable().optional(),
  orden:  z.number().int().positive().optional(),
}).strict()

type Params = { params: Promise<{ id: string; dim_id: string }> }

async function resolveDimension(materia_id: string, dim_id: string) {
  const supabase = await createClient()
  const { data: materia } = await supabase
    .from('materias')
    .select('institucion_id')
    .eq('id', materia_id)
    .is('deleted_at', null)
    .single()
  if (!materia) return { supabase, materia: null, dimension: null }

  const { data: dimension } = await supabase
    .from('materias_dimensiones')
    .select('id, materia_id')
    .eq('id', dim_id)
    .eq('materia_id', materia_id)
    .single()

  return { supabase, materia, dimension }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id: materia_id, dim_id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const { supabase, materia, dimension } = await resolveDimension(materia_id, dim_id)
  if (!materia) return Err.notFound('Materia no encontrada')
  if (!dimension) return Err.notFound('Dimensión no encontrada')
  if (!isSuperadmin(session) && !hasAnyRole(session, materia.institucion_id, ['admin']))
    return Err.forbidden()

  const body = await request.json().catch(() => null)
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) return Err.validation(parsed.error.issues[0].message)

  if (Object.keys(parsed.data).length === 0) {
    const { data } = await supabase
      .from('materias_dimensiones')
      .select('id, nombre, peso, orden')
      .eq('id', dim_id)
      .single()
    return ok(data)
  }

  const updateData = { ...parsed.data }
  if ('peso' in updateData) {
    updateData.peso = updateData.peso && updateData.peso > 0 ? updateData.peso : null
  }

  const { data, error } = await supabase
    .from('materias_dimensiones')
    .update(updateData)
    .eq('id', dim_id)
    .select('id, nombre, peso, orden')
    .single()

  if (error) return Err.server(error.message)
  return ok(data)
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id: materia_id, dim_id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const { supabase, materia, dimension } = await resolveDimension(materia_id, dim_id)
  if (!materia) return Err.notFound('Materia no encontrada')
  if (!dimension) return Err.notFound('Dimensión no encontrada')
  if (!isSuperadmin(session) && !hasAnyRole(session, materia.institucion_id, ['admin']))
    return Err.forbidden()

  const { error } = await supabase
    .from('materias_dimensiones')
    .delete()
    .eq('id', dim_id)

  if (error) return Err.server(error.message)
  return ok({ deleted: true })
}
