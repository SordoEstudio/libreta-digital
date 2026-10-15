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

  const { data: periodo, error: periodoErr } = await supabase
    .from('periodos')
    .select('id, nombre, cerrado_at, instituciones(slug, nombre)')
    .eq('id', periodo_id)
    .eq('institucion_id', institucion_id)
    .is('deleted_at', null)
    .single()
  if (periodoErr || !periodo) return Err.notFound('Período no encontrado')
  if (!periodo.cerrado_at) return Err.validation('El período debe estar cerrado antes de notificar')

  const inst = periodo.instituciones as { slug: string; nombre: string } | null
  if (!inst) return Err.server('Institución no encontrada')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  const { data: alumnos } = await supabase
    .from('alumnos')
    .select('id, nombre')
    .eq('institucion_id', institucion_id)
    .eq('activo', true)
    .is('deleted_at', null)

  type EmailTask = { to: string; alumno_nombre: string; boletin_url: string }
  const emailTasks: EmailTask[] = []

  for (const alumno of alumnos ?? []) {
    const { data: responsables } = await supabase
      .from('alumno_responsables')
      .select('personas(nombre, email)')
      .eq('alumno_id', alumno.id)

    for (const r of responsables ?? []) {
      const persona = r.personas as { nombre: string; email: string } | null
      if (!persona?.email) continue
      emailTasks.push({
        to: persona.email,
        alumno_nombre: alumno.nombre,
        boletin_url: `${appUrl}/dashboard/${inst.slug}/libreta/${alumno.id}/boletin`,
      })
    }
  }

  const results = await Promise.allSettled(
    emailTasks.map(task =>
      sendCierrePeriodo(task.to, {
        alumno_nombre: task.alumno_nombre,
        periodo_nombre: periodo.nombre,
        institucion_nombre: inst.nombre,
        boletin_url: task.boletin_url,
      })
    )
  )

  const enviados = results.filter(r => r.status === 'fulfilled' && r.value).length
  const errores = results.length - enviados

  return ok({ enviados, errores })
}
