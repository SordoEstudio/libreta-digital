import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSession, hasRole, isSuperadmin } from '@/lib/auth'
import { ok, Err } from '@/lib/api'

type Params = { params: Promise<{ id: string }> }

type AcuseRow = {
  alumno_id: string
  alumno_nombre: string
  alumno_apellido: string | null
  curso_nombre: string | null
  responsable_persona_id: string
  responsable_nombre: string
  responsable_apellido: string | null
  confirmed_at: string | null
}

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()
  if (!isSuperadmin(session) && !hasRole(session, id, 'admin'))
    return Err.forbidden()

  const { searchParams } = new URL(request.url)
  const periodoId = searchParams.get('periodo_id')
  if (!periodoId) return Err.validation('periodo_id requerido')

  const admin = createAdminClient()

  // Query 1: get the período to find the año_lectivo_id
  const { data: periodoRaw, error: periodoErr } = await admin
    .from('periodos')
    .select('*')
    .eq('id', periodoId)
    .eq('institucion_id', id)
    .is('deleted_at', null)
    .single()

  if (periodoErr || !periodoRaw) return Err.notFound('Período no encontrado')

  const periodo = periodoRaw as { id: string; año_lectivo_id: string }

  // Get all courses for this year (to scope alumnos)
  const { data: cursos, error: cursosErr } = await admin
    .from('cursos')
    .select('id, nombre')
    .eq('año_lectivo_id', periodo.año_lectivo_id)
    .is('deleted_at', null)

  if (cursosErr) return Err.server(cursosErr.message)

  const cursoMap = new Map<string, string>(
    (cursos ?? []).map(c => [c.id, c.nombre])
  )

  if (cursoMap.size === 0) return ok([])

  // Query 2a: get all alumnos in institution with active inscriptions
  type InscItem = { curso_id: string; activo: boolean; deleted_at: string | null }

  const { data: alumnos, error: alumnosErr } = await admin
    .from('alumnos')
    .select('id, nombre, apellido, alumno_inscripciones(curso_id, activo, deleted_at)')
    .eq('institucion_id', id)
    .eq('activo', true)
    .is('deleted_at', null)

  if (alumnosErr) return Err.server(alumnosErr.message)

  // Build a map of alumno_id -> curso_nombre for alumnos enrolled in this year's courses
  type AlumnoRaw = {
    id: string
    nombre: string
    apellido: string | null
    alumno_inscripciones: InscItem[]
  }

  const alumnoNombreMap = new Map<string, { nombre: string; apellido: string | null }>()
  const alumnoCursoMap = new Map<string, string | null>()

  for (const a of (alumnos ?? []) as AlumnoRaw[]) {
    const inscList = (a.alumno_inscripciones ?? []) as InscItem[]
    const activeInsc = inscList.find(i => i.activo && !i.deleted_at && cursoMap.has(i.curso_id))
    if (!activeInsc) continue
    alumnoNombreMap.set(a.id, { nombre: a.nombre, apellido: a.apellido })
    alumnoCursoMap.set(a.id, cursoMap.get(activeInsc.curso_id) ?? null)
  }

  const alumnoIds = [...alumnoNombreMap.keys()]

  if (alumnoIds.length === 0) return ok([])

  // Query 2b: get responsables for those alumnos
  const { data: responsables, error: respErr } = await admin
    .from('alumno_responsables')
    .select('alumno_id, persona_id')
    .in('alumno_id', alumnoIds)

  if (respErr) return Err.server(respErr.message)

  const personaIds = [...new Set((responsables ?? []).map(r => r.persona_id))]

  const { data: personas, error: personasErr } = await admin
    .from('personas')
    .select('id, nombre, apellido')
    .in('id', personaIds)

  if (personasErr) return Err.server(personasErr.message)

  const personaMap = new Map<string, { nombre: string; apellido: string | null }>(
    (personas ?? []).map(p => [p.id, { nombre: p.nombre, apellido: p.apellido ?? null }])
  )

  // Query 3: get acuses for this period
  const { data: acuses, error: acusesErr } = await admin
    .from('boletin_acuses')
    .select('alumno_id, persona_id, confirmed_at')
    .eq('periodo_id', periodoId)

  if (acusesErr) return Err.server(acusesErr.message)

  // Build acuse lookup: "alumno_id:persona_id" → confirmed_at
  const acuseMap = new Map<string, string>()
  for (const a of acuses ?? []) {
    acuseMap.set(`${a.alumno_id}:${a.persona_id}`, a.confirmed_at)
  }

  // Shape into flat rows: one per (alumno, responsable) pair
  const rows: AcuseRow[] = []

  for (const r of responsables ?? []) {
    const alumnoInfo = alumnoNombreMap.get(r.alumno_id)
    if (!alumnoInfo) continue
    const persona = personaMap.get(r.persona_id)
    if (!persona) continue

    rows.push({
      alumno_id: r.alumno_id,
      alumno_nombre: alumnoInfo.nombre,
      alumno_apellido: alumnoInfo.apellido,
      curso_nombre: alumnoCursoMap.get(r.alumno_id) ?? null,
      responsable_persona_id: r.persona_id,
      responsable_nombre: persona.nombre,
      responsable_apellido: persona.apellido,
      confirmed_at: acuseMap.get(`${r.alumno_id}:${r.persona_id}`) ?? null,
    })
  }

  return ok(rows)
}
