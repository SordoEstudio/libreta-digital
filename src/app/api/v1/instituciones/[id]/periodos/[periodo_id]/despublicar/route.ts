import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasRole } from '@/lib/auth'
import { ok, Err } from '@/lib/api'
import { logActividad } from '@/lib/actividad'

type Params = { params: Promise<{ id: string; periodo_id: string }> }

export async function POST(_request: NextRequest, { params }: Params) {
  const { id: institucion_id, periodo_id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()
  if (!isSuperadmin(session) && !hasRole(session, institucion_id, 'admin')) return Err.forbidden()

  const supabase = await createClient()

  const { data: periodo, error: periodoErr } = await supabase
    .from('periodos')
    .select('id, nombre, publicado_at')
    .eq('id', periodo_id)
    .eq('institucion_id', institucion_id)
    .is('deleted_at', null)
    .single()
  if (periodoErr || !periodo) return Err.notFound('Período no encontrado')
  const { error } = await supabase
    .from('periodos')
    .update({ publicado_at: null })
    .eq('id', periodo_id)
  if (error) return Err.server(error.message)

  await logActividad({
    institucion_id,
    persona_id: session.persona_id,
    accion: 'despublicar_periodo',
    entidad: 'periodos',
    entidad_id: periodo_id,
    metadata: { periodo_nombre: (periodo as { nombre: string }).nombre },
  })

  // Null out publicado_at for all existing per-curso rows
  await supabase
    .from('periodo_cierre_cursos')
    .update({ publicado_at: null })
    .eq('periodo_id', periodo_id)

  return ok({ despublicado: true })
}
