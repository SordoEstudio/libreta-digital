import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasRole } from '@/lib/auth'
import { ok, Err } from '@/lib/api'
import { sendCierrePeriodo } from '@/lib/email'

type Params = { params: Promise<{ id: string; periodo_id: string }> }

export async function POST(_request: NextRequest, { params }: Params) {
  const { id: institucion_id, periodo_id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()
  if (!isSuperadmin(session) && !hasRole(session, institucion_id, 'admin')) return Err.forbidden()

  const supabase = await createClient()

  const { data: periodoRaw, error: periodoErr } = await supabase
    .from('periodos')
    .select('*')
    .eq('id', periodo_id)
    .eq('institucion_id', institucion_id)
    .is('deleted_at', null)
    .single()
  if (periodoErr || !periodoRaw) return Err.notFound('Período no encontrado')
  const periodo = periodoRaw as { id: string; nombre: string; cerrado_at: string | null; año_lectivo_id: string }

  if (!periodo.cerrado_at) return Err.validation('El período debe estar cerrado antes de notificar')

  const { data: inst } = await supabase
    .from('instituciones')
    .select('slug, nombre, logo_rectangular_url')
    .eq('id', institucion_id)
    .is('deleted_at', null)
    .single()
  if (!inst) return Err.server('Institución no encontrada')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  // Scope to students enrolled in this period's year
  const { data: cursos } = await supabase
    .from('cursos')
    .select('id')
    .eq('año_lectivo_id', periodo.año_lectivo_id)
    .is('deleted_at', null)
  const cursoIds = (cursos ?? []).map(c => c.id)

  let alumnoIds: string[] = []
  if (cursoIds.length > 0) {
    const { data: inscripciones } = await supabase
      .from('alumno_inscripciones')
      .select('alumno_id, alumnos(id, nombre)')
      .in('curso_id', cursoIds)
      .eq('activo', true)
      .is('deleted_at', null)
    alumnoIds = [...new Set((inscripciones ?? []).map(i => i.alumno_id))]
  }

  if (alumnoIds.length === 0) return ok({ enviados: 0, errores: 0 })

  const { data: alumnos } = await supabase
    .from('alumnos')
    .select('id, nombre')
    .in('id', alumnoIds)
    .eq('activo', true)
    .is('deleted_at', null)
  const alumnoMap = new Map((alumnos ?? []).map(a => [a.id, a.nombre]))

  // Batch-fetch all responsables for these alumnos
  const { data: responsables } = await supabase
    .from('alumno_responsables')
    .select('alumno_id, personas(nombre, email)')
    .in('alumno_id', alumnoIds)

  type EmailTask = { to: string; alumno_nombre: string; boletin_url: string }
  const emailTasks: EmailTask[] = []

  for (const r of responsables ?? []) {
    const persona = r.personas as { nombre: string; email: string } | null
    if (!persona?.email) continue
    const alumnoNombre = alumnoMap.get(r.alumno_id) ?? 'Alumno'
    emailTasks.push({
      to: persona.email,
      alumno_nombre: alumnoNombre,
      boletin_url: `${appUrl}/dashboard/${inst.slug}/libreta/${r.alumno_id}/boletin`,
    })
  }

  const results = await Promise.allSettled(
    emailTasks.map(task =>
      sendCierrePeriodo(task.to, {
        alumno_nombre: task.alumno_nombre,
        periodo_nombre: periodo.nombre,
        institucion_nombre: inst.nombre,
        boletin_url: task.boletin_url,
        logo_url: inst.logo_rectangular_url ?? undefined,
      })
    )
  )

  const enviados = results.filter(r => r.status === 'fulfilled' && r.value).length
  const errores = results.length - enviados

  return ok({ enviados, errores })
}
