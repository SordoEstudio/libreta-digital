import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasAnyRole } from '@/lib/auth'
import { created, Err } from '@/lib/api'

type Params = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const supabase = await createClient()

  const { data: ev } = await supabase
    .from('evaluaciones')
    .select('id, nombre, tipo, materia_id, institucion_id, periodo_id, peso, orden, permite_recuperatorio, recuperatorio_de_evaluacion_id')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!ev) return Err.notFound()
  if (!isSuperadmin(session) && !hasAnyRole(session, ev.institucion_id, ['admin', 'docente']))
    return Err.forbidden()
  if (!ev.permite_recuperatorio)
    return Err.validation('Esta evaluación no permite recuperatorio')
  if (ev.recuperatorio_de_evaluacion_id)
    return Err.validation('No se puede crear recuperatorio de un recuperatorio')

  const { data: existing } = await supabase
    .from('evaluaciones')
    .select('id')
    .eq('recuperatorio_de_evaluacion_id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (existing) return Err.conflict('Ya existe un recuperatorio para esta evaluación')

  const { data: nuevo, error } = await supabase
    .from('evaluaciones')
    .insert({
      materia_id: ev.materia_id,
      institucion_id: ev.institucion_id,
      nombre: `${ev.nombre} — Recuperatorio`,
      tipo: 'recuperatorio' as const,
      peso: ev.peso,
      orden: ev.orden + 1,
      ...(ev.periodo_id ? { periodo_id: ev.periodo_id } : {}),
      recuperatorio_de_evaluacion_id: id,
      permite_recuperatorio: false,
    })
    .select('id, nombre, tipo, materia_id')
    .single()

  if (error) return Err.server(error.message)
  return created(nuevo)
}
