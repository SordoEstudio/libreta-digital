import { NextRequest } from 'next/server'
import { z } from 'zod'
import { zId } from '@/lib/validators'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSession, isSuperadmin, hasAnyRole, hasRole } from '@/lib/auth'
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
  const adminSupabase = createAdminClient()

  // ── Resolve institution ────────────────────────────────────────────────────
  // For 'all', we need to determine the institution from session membership
  let institucion_id: string

  if (curso_id === 'all') {
    if (!isSuperadmin(session) && !session.memberships.some(m => m.rol === 'admin'))
      return Err.forbidden()

    const adminMembership = isSuperadmin(session)
      ? null
      : session.memberships.find(m => m.rol === 'admin')

    if (!isSuperadmin(session) && !adminMembership) return Err.forbidden()
    institucion_id = adminMembership?.institucion_id ?? ''

    if (!institucion_id) return Err.validation('No se pudo determinar la institución')
  } else {
    const { data: curso } = await supabase
      .from('cursos')
      .select('institucion_id')
      .eq('id', curso_id)
      .is('deleted_at', null)
      .single()

    if (!curso) return Err.notFound('Curso no encontrado')
    if (!isSuperadmin(session) && !hasAnyRole(session, curso.institucion_id, ['admin', 'docente']))
      return Err.forbidden()

    // Docente: must have a materia assigned in this course
    if (!isSuperadmin(session) && hasRole(session, curso.institucion_id, 'docente') &&
        !hasAnyRole(session, curso.institucion_id, ['admin'])) {
      const { data: matDoc } = await supabase
        .from('materia_docentes')
        .select('materia_id')
        .eq('persona_id', session.persona_id)
        .in('materia_id',
          (await supabase
            .from('materias')
            .select('id')
            .eq('curso_id', curso_id)
            .is('deleted_at', null)
          ).data?.map(m => m.id) ?? []
        )
        .limit(1)
        .maybeSingle()
      if (!matDoc) return Err.forbidden()
    }

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

    institucion_id = curso.institucion_id
  }

  // ── Fetch institution for email ────────────────────────────────────────────
  const { data: inst } = await supabase
    .from('instituciones')
    .select('nombre, logo_rectangular_url')
    .eq('id', institucion_id)
    .single()

  const institucion_nombre = inst?.nombre ?? 'Libreta Digital'
  const logo_url = inst?.logo_rectangular_url ?? undefined
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  // ── Resolve target courses ─────────────────────────────────────────────────
  let targetCursoIds: string[]
  if (curso_id === 'all') {
    const { data: cursos } = await supabase
      .from('cursos')
      .select('id')
      .eq('institucion_id', institucion_id)
      .is('deleted_at', null)
    targetCursoIds = (cursos ?? []).map(c => c.id)
    if (targetCursoIds.length === 0)
      return Err.validation('No hay cursos activos en la institución')
  } else {
    targetCursoIds = [curso_id]
  }

  // ── Create comunicados (one per course) ────────────────────────────────────
  const comunicadoIds: string[] = []
  const comIdToCursoId = new Map<string, string>()
  for (const cid of targetCursoIds) {
    const { data: com, error } = await supabase
      .from('comunicados')
      .insert({
        institucion_id,
        autor_id: session.persona_id,
        titulo,
        contenido,
        curso_id: cid,
        ...(materia_id && curso_id !== 'all' ? { materia_id } : {}),
      })
      .select('id')
      .single()
    if (error || !com) return Err.server(error?.message ?? 'Error al crear comunicado')
    comunicadoIds.push(com.id)
    comIdToCursoId.set(com.id, cid)
  }

  // ── Gather all responsables across all target courses ──────────────────────
  const { data: insc } = await adminSupabase
    .from('alumno_inscripciones')
    .select('alumno_id, curso_id')
    .in('curso_id', targetCursoIds)
    .eq('activo', true)
    .is('deleted_at', null)

  // Map alumno → curso for confirmaciones
  const alumnoCurso = new Map<string, string>()
  for (const i of (insc ?? [])) alumnoCurso.set(i.alumno_id, i.curso_id)
  const alumnoIds = [...alumnoCurso.keys()]

  if (alumnoIds.length === 0) {
    // Mark as sent anyway
    await supabase.from('comunicados').update({ enviado_at: new Date().toISOString() })
      .in('id', comunicadoIds)
    return created({ ids: comunicadoIds, emails_enviados: 0, warning: 'Los cursos no tienen alumnos inscriptos' })
  }

  const { data: respRaw } = await adminSupabase
    .from('alumno_responsables')
    .select('persona_id, alumno_id')
    .in('alumno_id', alumnoIds)
    .eq('institucion_id', institucion_id)

  // Map persona → alumnos they're responsible for
  const personaAlumnos = new Map<string, string[]>()
  for (const r of (respRaw ?? [])) {
    const arr = personaAlumnos.get(r.persona_id) ?? []
    arr.push(r.alumno_id)
    personaAlumnos.set(r.persona_id, arr)
  }

  const personaIds = [...personaAlumnos.keys()]
  if (personaIds.length === 0) {
    await supabase.from('comunicados').update({ enviado_at: new Date().toISOString() })
      .in('id', comunicadoIds)
    return created({ ids: comunicadoIds, emails_enviados: 0, warning: 'Los alumnos no tienen responsables asignados' })
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
    await supabase.from('comunicados').update({ enviado_at: new Date().toISOString() })
      .in('id', comunicadoIds)
    return created({ ids: comunicadoIds, emails_enviados: 0, warning: 'Ningún responsable tiene email registrado' })
  }

  // ── Create confirmaciones: one per (comunicado, responsable) ───────────────
  // Each responsable gets confirmaciones for each comunicado that covers their alumnos
  const confirmacionRows: {
    comunicado_id: string
    persona_id: string
    institucion_id: string
    email: string
  }[] = []

  for (const r of responsables) {
    const alumnosDeEsteResponsable = personaAlumnos.get(r.persona_id) ?? []
    for (const comId of comunicadoIds) {
      const cursoDeCom = comIdToCursoId.get(comId)
      if (!cursoDeCom) continue
      const tieneAlumnoEnCurso = alumnosDeEsteResponsable.some(
        aid => alumnoCurso.get(aid) === cursoDeCom
      )
      if (!tieneAlumnoEnCurso) continue
      confirmacionRows.push({
        comunicado_id: comId,
        persona_id: r.persona_id,
        institucion_id,
        email: r.email,
      })
    }
  }

  if (confirmacionRows.length > 0) {
    const { error: confError } = await supabase
      .from('comunicado_confirmaciones')
      .insert(confirmacionRows)
    if (confError) return Err.server(confError.message)
  }

  // ── Mark as sent ───────────────────────────────────────────────────────────
  const now = new Date().toISOString()
  await supabase.from('comunicados').update({ enviado_at: now }).in('id', comunicadoIds)

  // ── Fetch real confirmacion ids for email links ────────────────────────────
  const { data: createdConfs } = await adminSupabase
    .from('comunicado_confirmaciones')
    .select('id, persona_id')
    .in('comunicado_id', comunicadoIds)

  const confByPersona = new Map((createdConfs ?? []).map(c => [c.persona_id, c.id]))

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

  return created({
    ids: comunicadoIds,
    emails_enviados: responsables.length,
    ...(curso_id === 'all' ? { cursos_enviados: targetCursoIds.length } : { id: comunicadoIds[0] }),
  })
}

const ListQuerySchema = z.object({
  institucion_id: zId(),
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
