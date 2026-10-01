import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasRole } from '@/lib/auth'
import { created, Err } from '@/lib/api'

const PostSchema = z.object({
  curso_id: z.string().uuid(),
}).strict()

type Params = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  const { id: alumno_id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const supabase = await createClient()
  const { data: alumno } = await supabase
    .from('alumnos')
    .select('id, institucion_id')
    .eq('id', alumno_id)
    .is('deleted_at', null)
    .single()

  if (!alumno) return Err.notFound()
  if (!isSuperadmin(session) && !hasRole(session, alumno.institucion_id, 'admin')) return Err.forbidden()

  const body = await request.json().catch(() => null)
  const parsed = PostSchema.safeParse(body)
  if (!parsed.success) return Err.validation(parsed.error.issues[0].message)

  const { curso_id } = parsed.data

  const { data: curso } = await supabase
    .from('cursos')
    .select('id')
    .eq('id', curso_id)
    .eq('institucion_id', alumno.institucion_id)
    .is('deleted_at', null)
    .single()

  if (!curso) return Err.notFound('Curso no encontrado en esta institución')

  await supabase
    .from('alumno_inscripciones')
    .update({ activo: false })
    .eq('alumno_id', alumno_id)
    .eq('activo', true)
    .is('deleted_at', null)

  const { data, error } = await supabase
    .from('alumno_inscripciones')
    .insert({ alumno_id, curso_id, institucion_id: alumno.institucion_id, activo: true })
    .select('id, curso_id, activo')
    .single()

  if (error) return Err.server(error.message)
  return created(data)
}
