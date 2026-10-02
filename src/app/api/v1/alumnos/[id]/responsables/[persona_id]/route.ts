import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasRole } from '@/lib/auth'
import { ok, Err } from '@/lib/api'

const PatchSchema = z.object({
  relacion: z.string().nullable().optional(),
})

type Params = { params: Promise<{ id: string; persona_id: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id: alumno_id, persona_id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const supabase = await createClient()
  const { data: alumno } = await supabase
    .from('alumnos').select('institucion_id').eq('id', alumno_id).single()
  if (!alumno) return Err.notFound()
  if (!isSuperadmin(session) && !hasRole(session, alumno.institucion_id, 'admin')) return Err.forbidden()

  const body = await request.json().catch(() => null)
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) return Err.validation(parsed.error.issues[0].message)

  const { error } = await supabase
    .from('alumno_responsables')
    .update({ relacion: parsed.data.relacion ?? null })
    .eq('alumno_id', alumno_id)
    .eq('persona_id', persona_id)

  if (error) return Err.server(error.message)
  return ok({ alumno_id, persona_id })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id: alumno_id, persona_id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const supabase = await createClient()
  const { data: alumno } = await supabase
    .from('alumnos').select('institucion_id').eq('id', alumno_id).single()
  if (!alumno) return Err.notFound()
  if (!isSuperadmin(session) && !hasRole(session, alumno.institucion_id, 'admin')) return Err.forbidden()

  const { error } = await supabase
    .from('alumno_responsables')
    .delete()
    .eq('alumno_id', alumno_id)
    .eq('persona_id', persona_id)

  if (error) return Err.server(error.message)
  return ok({ alumno_id, persona_id })
}
