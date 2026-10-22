import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSession, isSuperadmin, hasAnyRole } from '@/lib/auth'
import { ok, created, Err } from '@/lib/api'
import { CreateComunicadoSchema, deduplicarResponsables } from '@/lib/comunicados'
import { sendComunicadoBatch } from '@/lib/email'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return Err.unauthorized()
  if (!session.persona_id) return Err.forbidden()

  const body = await request.json().catch(() => null)
  const parsed = CreateComunicadoSchema.safeParse(body)
  if (!parsed.success) return Err.validation(parsed.error.issues[0].message)

  const { titulo, contenido, curso_id, materia_id } = parsed.data

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

  if (materia_id) {
    const { data: mat } = await supabase
      .from('materias')
      .select('id')
      .eq('id', materia_id)
      .eq('curso_id', curso_id)
      .is('deleted_at', null)
      .maybeSingle()
    if (!mat) return Err.validation('La materia no pertenece al curso seleccionado')
  }

  const { data: comunicado, error: insertError } = await supabase
    .from('comunicados')
    .insert({
      institucion_id: curso.institucion_id,
      autor_id: session.persona_id,
      titulo,
      contenido,
      curso_id,
      ...(materia_id ? { materia_id } : {}),
    })
    .select('id, titulo, contenido, curso_id, created_at, enviado_at')
    .single()

  if (insertError || !comunicado) return Err.server(insertError?.message ?? 'Error al crear comunicado')
  if (comunicado.enviado_at) return Err.conflict('Este comunicado ya fue enviado')

  // Fetch responsables en 3 queries — usa admin client porque personas_select solo expone la fila propia
  const adminSupabase = createAdminClient()

  const { data: insc } = await adminSupabase
    .from('alumno_inscripciones')
    .select('alumno_id')
    .eq('curso_id', curso_id)
    .eq('activo', true)
    .is('deleted_at', null)

  const alumnoIds = (insc ?? []).map(i => i.alumno_id)

  if (alumnoIds.length === 0) {
    return created({ ...comunicado, emails_enviados: 0, warning: 'El curso no tiene alumnos inscriptos' })
  }

  const { data: respRaw } = await adminSupabase
    .from('alumno_responsables')
    .select('persona_id')
    .in('alumno_id', alumnoIds)
    .eq('institucion_id', curso.institucion_id)

  const personaIds = [...new Set((respRaw ?? []).map(r => r.persona_id))]

  if (personaIds.length === 0) {
    return created({ ...comunicado, emails_enviados: 0, warning: 'Los alumnos no tienen responsables asignados' })
  }

  const { data: personas } = await adminSupabase
    .from('personas')
    .select('id, email')
    .in('id', personaIds)
    .is('deleted_at', null)

  const responsables = deduplicarResponsables(
    (personas ?? []).filter(p => !!p.email).map(p => ({ persona_id: p.id, email: p.email }))
  )

  if (responsables.length === 0) {
    return created({ ...comunicado, emails_enviados: 0, warning: 'Ningún responsable tiene email registrado' })
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

  // Fetch institución para el email
  const { data: inst } = await supabase
    .from('instituciones')
    .select('nombre, logo_rectangular_url')
    .eq('id', curso.institucion_id)
    .single()

  const institucion_nombre = inst?.nombre ?? 'Libreta Digital'
  const logo_url = inst?.logo_rectangular_url ?? undefined
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  // Mark as sent before fire-and-forget to prevent double-send
  await supabase
    .from('comunicados')
    .update({ enviado_at: new Date().toISOString() })
    .eq('id', comunicado.id)

  // Fire-and-forget batch send
  const confByPersona = new Map(confirmaciones.map(c => [c.persona_id, c.id]))
  void sendComunicadoBatch(
    responsables
      .map(r => {
        const confId = confByPersona.get(r.persona_id)
        if (!confId) return null
        return {
          email: r.email,
          props: { titulo, contenido, institucion_nombre, confirm_url: `${appUrl}/confirmar/${confId}`, logo_url },
          confId,
        }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
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
