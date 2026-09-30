import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasRole } from '@/lib/auth'
import { ok, noContent, Err } from '@/lib/api'

const PatchSchema = z.object({
  nombre: z.string().min(1).optional(),
  nivel: z.string().optional(),
  turno: z.enum(['mañana', 'tarde', 'noche']).optional(),
  escala_id: z.string().uuid().nullable().optional(),
}).strict()

type Params = { params: Promise<{ id: string }> }

async function getInstitucionId(cursoId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('cursos')
    .select('institucion_id')
    .eq('id', cursoId)
    .single()
  return data?.institucion_id ?? null
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const institucion_id = await getInstitucionId(id)
  if (!institucion_id) return Err.notFound()
  if (!isSuperadmin(session) && !hasRole(session, institucion_id, 'admin')) return Err.forbidden()

  const body = await request.json().catch(() => null)
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) return Err.validation(parsed.error.issues[0].message)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cursos')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error) return Err.server(error.message)
  return ok(data)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const institucion_id = await getInstitucionId(id)
  if (!institucion_id) return Err.notFound()
  if (!isSuperadmin(session) && !hasRole(session, institucion_id, 'admin')) return Err.forbidden()

  const supabase = await createClient()

  const { count } = await supabase
    .from('alumno_inscripciones')
    .select('id', { count: 'exact', head: true })
    .eq('curso_id', id)
    .eq('activo', true)
    .is('deleted_at', null)

  if (count && count > 0) return Err.conflict('El curso tiene alumnos activos')

  const { error } = await supabase
    .from('cursos')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return Err.server(error.message)
  return noContent()
}
