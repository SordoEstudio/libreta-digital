import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasRole } from '@/lib/auth'
import { ok, Err } from '@/lib/api'

const PatchSchema = z.object({
  nombre: z.string().min(1).optional(),
  escala_id: z.string().uuid().nullable().optional(),
  docentes_ids: z.array(z.string().uuid()).optional(),
}).strict()

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const supabase = await createClient()
  const { data: materia } = await supabase
    .from('materias')
    .select('institucion_id, catalogo_id')
    .eq('id', id)
    .single()

  if (!materia) return Err.notFound()
  if (!isSuperadmin(session) && !hasRole(session, materia.institucion_id, 'admin')) return Err.forbidden()

  const body = await request.json().catch(() => null)
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) return Err.validation(parsed.error.issues[0].message)

  const { nombre, docentes_ids, ...materiaFields } = parsed.data
  const updateData: Record<string, unknown> = { ...materiaFields }

  // If nombre provided, find-or-create catalog entry and update link
  if (nombre !== undefined) {
    const { data: existing } = await supabase
      .from('materias_catalogo')
      .select('id')
      .eq('institucion_id', materia.institucion_id)
      .ilike('nombre', nombre)
      .is('deleted_at', null)
      .single()

    if (existing) {
      updateData.catalogo_id = existing.id
    } else {
      const { data: newEntry, error: catalogError } = await supabase
        .from('materias_catalogo')
        .insert({ nombre, institucion_id: materia.institucion_id })
        .select('id')
        .single()
      if (catalogError) return Err.server(catalogError.message)
      updateData.catalogo_id = newEntry.id
    }
  }

  if (Object.keys(updateData).length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await supabase.from('materias').update(updateData as any).eq('id', id)
  }

  if (docentes_ids !== undefined) {
    const { error: deleteError } = await supabase
      .from('materia_docentes').delete().eq('materia_id', id)
    if (deleteError) return Err.server(deleteError.message)

    if (docentes_ids.length > 0) {
      const { error: insertError } = await supabase
        .from('materia_docentes').insert(
          docentes_ids.map(persona_id => ({
            materia_id: id,
            persona_id,
            institucion_id: materia.institucion_id,
          }))
        )
      if (insertError) return Err.server(insertError.message)
    }
  }

  const { data, error } = await supabase
    .from('materias')
    .select('id, catalogo_id, escala_id, materias_catalogo(id, nombre)')
    .eq('id', id)
    .single()

  if (error) return Err.server(error.message)
  return ok({
    id: data.id,
    catalogo_id: data.catalogo_id,
    nombre: (data.materias_catalogo as { nombre: string } | null)?.nombre ?? '',
    escala_id: data.escala_id,
  })
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const supabase = await createClient()
  const { data: materia } = await supabase
    .from('materias')
    .select('institucion_id')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!materia) return Err.notFound()
  if (!isSuperadmin(session) && !hasRole(session, materia.institucion_id, 'admin')) return Err.forbidden()

  const { count } = await supabase
    .from('notas')
    .select('evaluaciones!inner(materia_id)', { count: 'exact', head: true })
    .eq('evaluaciones.materia_id', id)
    .is('deleted_at', null)

  if ((count ?? 0) > 0) return Err.validation('La materia tiene notas cargadas. No se puede eliminar.')

  const { error } = await supabase
    .from('materias')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return Err.server(error.message)
  return ok({ deleted: true })
}
