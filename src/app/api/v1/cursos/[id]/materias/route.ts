import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasRole, hasAnyRole } from '@/lib/auth'
import { ok, created, Err } from '@/lib/api'

const CreateSchema = z.object({
  nombre: z.string().min(1),
  escala_id: z.string().uuid().optional(),
  docentes_ids: z.array(z.string().uuid()).default([]),
})

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id: curso_id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const supabase = await createClient()
  const { data: curso } = await supabase
    .from('cursos')
    .select('institucion_id')
    .eq('id', curso_id)
    .single()

  if (!curso) return Err.notFound()
  if (!isSuperadmin(session) && !hasAnyRole(session, curso.institucion_id, ['admin', 'docente', 'responsable']))
    return Err.forbidden()

  const { data, error } = await supabase
    .from('materias')
    .select('id, catalogo_id, escala_id, materias_catalogo(id, nombre), materia_docentes(persona_id, personas(id, nombre))')
    .eq('curso_id', curso_id)
    .is('deleted_at', null)
    .order('materias_catalogo(nombre)')

  if (error) return Err.server(error.message)

  const formatted = data.map(m => ({
    id: m.id,
    catalogo_id: m.catalogo_id,
    nombre: (m.materias_catalogo as { id: string; nombre: string } | null)?.nombre ?? '',
    escala_id: m.escala_id,
    docentes: (m.materia_docentes ?? []).map((md: { persona_id: string; personas: { id: string; nombre: string } | null }) => ({
      persona_id: md.persona_id,
      nombre: md.personas?.nombre ?? '',
    })),
  }))
  return ok(formatted)
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id: curso_id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const supabase = await createClient()
  const { data: curso } = await supabase
    .from('cursos')
    .select('institucion_id')
    .eq('id', curso_id)
    .single()

  if (!curso) return Err.notFound()
  if (!isSuperadmin(session) && !hasRole(session, curso.institucion_id, 'admin')) return Err.forbidden()

  const body = await request.json().catch(() => null)
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) return Err.validation(parsed.error.issues[0].message)

  const { nombre, docentes_ids, ...materiaData } = parsed.data

  // Find or create catalog entry
  let catalogoId: string
  const { data: existing } = await supabase
    .from('materias_catalogo')
    .select('id')
    .eq('institucion_id', curso.institucion_id)
    .ilike('nombre', nombre)
    .is('deleted_at', null)
    .single()

  if (existing) {
    catalogoId = existing.id
  } else {
    const { data: newEntry, error: catalogError } = await supabase
      .from('materias_catalogo')
      .insert({ nombre, institucion_id: curso.institucion_id })
      .select('id')
      .single()
    if (catalogError) return Err.server(catalogError.message)
    catalogoId = newEntry.id
  }

  const { data: materia, error } = await supabase
    .from('materias')
    .insert({ ...materiaData, catalogo_id: catalogoId, curso_id, institucion_id: curso.institucion_id })
    .select('id, catalogo_id, materias_catalogo(nombre)')
    .single()

  if (error) return Err.server(error.message)

  if (docentes_ids.length > 0) {
    await supabase.from('materia_docentes').insert(
      docentes_ids.map(persona_id => ({
        materia_id: materia.id,
        persona_id,
        institucion_id: curso.institucion_id,
      }))
    )
  }

  return created({
    id: materia.id,
    catalogo_id: materia.catalogo_id,
    nombre: (materia.materias_catalogo as { nombre: string } | null)?.nombre ?? nombre,
  })
}
