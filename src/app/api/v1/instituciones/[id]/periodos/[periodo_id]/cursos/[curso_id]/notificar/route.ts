import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasRole } from '@/lib/auth'
import { ok, Err } from '@/lib/api'
import { sendCierrePeriodo } from '@/lib/email'
import { logActividad } from '@/lib/actividad'

type Params = { params: Promise<{ id: string; periodo_id: string; curso_id: string }> }

export async function POST(_request: NextRequest, { params }: Params) {
  const { id: institucion_id, periodo_id, curso_id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()
  if (!isSuperadmin(session) && !hasRole(session, institucion_id, 'admin')) return Err.forbidden()

  const supabase = await createClient()

  const { data: periodoRaw, error: periodoErr } = await supabase
    .from('periodos')
    .select('id, nombre, cerrado_at')
    .eq('id', periodo_id)
    .eq('institucion_id', institucion_id)
    .is('deleted_at', null)
    .single()
  if (periodoErr || !periodoRaw) return Err.notFound('Período no encontrado')
  const periodo = periodoRaw as { id: string; nombre: string; cerrado_at: string | null }
  if (!periodo.cerrado_at) return Err.validation('El período debe estar cerrado antes de notificar')

  const { data: inst } = await supabase
    .from('instituciones')
    .select('slug, nombre, logo_rectangular_url')
    .eq('id', institucion_id)
    .is('deleted_at', null)
    .single()
  if (!inst) return Err.server('Institución no encontrada')

  const { data: cursoData } = await supabase
    .from('cursos')
    .select('nombre')
    .eq('id', curso_id)
    .is('deleted_at', null)
    .maybeSingle()
  const cursoNombre = (cursoData as { nombre: string } | null)?.nombre ?? curso_id

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  const { data: inscripciones } = await supabase
    .from('alumno_inscripciones')
    .select('alumno_id')
    .eq('curso_id', curso_id)
    .eq('activo', true)
    .is('deleted_at', null)

  const alumnoIds = [...new Set((inscripciones ?? []).map(i => i.alumno_id))]
  if (alumnoIds.length === 0) return ok({ enviados: 0, errores: 0 })

  const { data: alumnos } = await supabase
    .from('alumnos')
    .select('id, nombre')
    .in('id', alumnoIds)
    .eq('activo', true)
    .is('deleted_at', null)
  const alumnoMap = new Map((alumnos ?? []).map(a => [a.id, a.nombre]))

  const { data: responsables } = await supabase
    .from('alumno_responsables')
    .select('alumno_id, personas(nombre, email)')
    .in('alumno_id', alumnoIds)

  type EmailTask = { to: string; alumno_nombre: string; boletin_url: string }
  const emailTasks: EmailTask[] = []

  for (const r of responsables ?? []) {
    const persona = r.personas as { nombre: string; email: string } | null
    if (!persona?.email) continue
    emailTasks.push({
      to: persona.email,
      alumno_nombre: alumnoMap.get(r.alumno_id) ?? 'Alumno',
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

  await logActividad({
    institucion_id,
    persona_id: session.persona_id,
    accion: 'notificar_curso',
    entidad: 'cursos',
    entidad_id: curso_id,
    metadata: { periodo_nombre: periodo.nombre, curso_nombre: cursoNombre, enviados },
  })

  return ok({ enviados, errores })
}
