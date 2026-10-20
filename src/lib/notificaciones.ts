import { createAdminClient } from '@/lib/supabase/admin'
import { sendNotaNueva } from '@/lib/email'

interface NotaContext {
  nota_id: string
  alumno_id: string
  alumno_nombre: string
  evaluacion_nombre: string
  evaluacion_tipo: string
  materia_nombre: string
  curso_nombre: string
  valor: string
  institucion_id: string
  institucion_nombre: string
  logo_url?: string
}

export async function notificarNotaCargada(ctx: NotaContext): Promise<void> {
  const admin = createAdminClient()

  const { data: responsables } = await admin
    .from('alumno_responsables')
    .select('personas(id, nombre, email)')
    .eq('alumno_id', ctx.alumno_id)

  if (!responsables || responsables.length === 0) return

  const tasks = responsables.flatMap(r => {
    const persona = r.personas as { id: string; nombre: string; email: string } | null
    if (!persona?.email) return []

    const titulo = `Nueva nota: ${ctx.evaluacion_nombre} — ${ctx.alumno_nombre}`
    const contenido = `${ctx.materia_nombre} · ${ctx.curso_nombre} · Nota: ${ctx.valor}`

    return [
      admin.from('notificaciones').insert({
        persona_id: persona.id,
        institucion_id: ctx.institucion_id,
        tipo: 'nota_nueva',
        titulo,
        contenido,
      }),
      sendNotaNueva(persona.email, {
        alumno_nombre: ctx.alumno_nombre,
        materia_nombre: ctx.materia_nombre,
        curso_nombre: ctx.curso_nombre,
        evaluacion_nombre: ctx.evaluacion_nombre,
        evaluacion_tipo: ctx.evaluacion_tipo,
        valor: ctx.valor,
        institucion_nombre: ctx.institucion_nombre,
        responsable_nombre: persona.nombre,
        logo_url: ctx.logo_url,
      }, `${ctx.nota_id}-${persona.id}`),
    ]
  })

  await Promise.allSettled(tasks)
}
