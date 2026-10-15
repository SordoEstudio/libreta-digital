import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasAnyRole } from '@/lib/auth'
import { ok, created, Err } from '@/lib/api'
import { CreateComunicadoSchema, deduplicarResponsables } from '@/lib/comunicados'
import { sendComunicado } from '@/lib/email'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return Err.unauthorized()
  if (!session.persona_id) return Err.forbidden()

  const body = await request.json().catch(() => null)
  const parsed = CreateComunicadoSchema.safeParse(body)
  if (!parsed.success) return Err.validation(parsed.error.issues[0].message)

  const { titulo, contenido, curso_id } = parsed.data

  const supabase = await createClient()

  const { data: curso } = await supabase
    .from('cursos')
    .select('institucion_id')
    .eq('id', curso_id)
    .is('deleted_at', null)
    .single()

  if (!curso) return Err.notFound('Curso no encontrado')
  if (!isSuperadmin(session) && !hasAnyRole(session, curso.institucion_id, ['admin', 'docente']))
    return Err.forbidden()

  const { data: comunicado, error: insertError } = await supabase
    .from('comunicados')
    .insert({
      institucion_id: curso.institucion_id,
      autor_id: session.persona_id,
      titulo,
      contenido,
      curso_id,
    })
    .select('id, titulo, contenido, curso_id, created_at')
    .single()

  if (insertError || !comunicado) return Err.server(insertError?.message ?? 'Error al crear comunicado')

  // Fetch responsables en 3 queries
  const { data: insc } = await supabase
    .from('alumno_inscripciones')
    .select('alumno_id')
    .eq('curso_id', curso_id)
    .eq('activo', true)
    .is('deleted_at', null)

  const alumnoIds = (insc ?? []).map(i => i.alumno_id)

  if (alumnoIds.length === 0) {
    return created({ ...comunicado, emails_enviados: 0 })
  }

  const { data: respRaw } = await supabase
    .from('alumno_responsables')
    .select('persona_id')
    .in('alumno_id', alumnoIds)
    .eq('institucion_id', curso.institucion_id)

  const personaIds = [...new Set((respRaw ?? []).map(r => r.persona_id))]

  if (personaIds.length === 0) {
    return created({ ...comunicado, emails_enviados: 0 })
  }

  const { data: personas } = await supabase
    .from('personas')
    .select('id, email')
    .in('id', personaIds)
    .is('deleted_at', null)

  const responsables = deduplicarResponsables(
    (personas ?? []).filter(p => !!p.email).map(p => ({ persona_id: p.id, email: p.email }))
  )

  if (responsables.length === 0) {
    return created({ ...comunicado, emails_enviados: 0 })
  }

  // INSERT confirmaciones
  const { data: confirmaciones, error: confError } = await supabase
    .from('comunicado_confirmaciones')
    .insert(
      responsables.map(r => ({
        comunicado_id: comunicado.id,
        persona_id: r.persona_id,
        institucion_id: curso.institucion_id,
        email: r.email,
      }))
    )
    .select('id, persona_id')

  if (confError || !confirmaciones) return Err.server(confError?.message ?? 'Error al crear confirmaciones')

  // Fetch nombre institución para el email
  const { data: inst } = await supabase
    .from('instituciones')
    .select('nombre')
    .eq('id', curso.institucion_id)
    .single()

  const institucion_nombre = inst?.nombre ?? 'Libreta Digital'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  // Fire-and-forget
  const confByPersona = new Map(confirmaciones.map(c => [c.persona_id, c.id]))
  Promise.all(
    responsables.map(r => {
      const confId = confByPersona.get(r.persona_id)
      if (!confId) return Promise.resolve()
      const confirm_url = `${appUrl}/confirmar/${confId}`
      return sendComunicado(r.email, { titulo, contenido, institucion_nombre, confirm_url }, confId)
        .catch(console.error)
    })
  )

  return created({ ...comunicado, emails_enviados: responsables.length })
}

const ListQuerySchema = z.object({
  institucion_id: z.string().uuid(),
})

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const { searchParams } = new URL(request.url)
  const parsed = ListQuerySchema.safeParse({ institucion_id: searchParams.get('institucion_id') })
  if (!parsed.success) return Err.validation('institucion_id inválido')

  const { institucion_id } = parsed.data

  if (!isSuperadmin(session) && !hasAnyRole(session, institucion_id, ['admin', 'docente']))
    return Err.forbidden()

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('comunicados')
    .select('id, titulo, curso_id, created_at, cursos(nombre), comunicado_confirmaciones(id, confirmed_at)')
    .eq('institucion_id', institucion_id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) return Err.server(error.message)

  const mapped = (data ?? []).map(c => {
    const confs = c.comunicado_confirmaciones ?? []
    return {
      id: c.id,
      titulo: c.titulo,
      curso_id: c.curso_id,
      created_at: c.created_at,
      cursos: c.cursos,
      total: confs.length,
      confirmados: confs.filter(cf => cf.confirmed_at !== null).length,
    }
  })

  return ok(mapped)
}
