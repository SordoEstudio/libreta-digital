import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasRole } from '@/lib/auth'
import { ok, Err } from '@/lib/api'

const CerrarSchema = z.object({
  activar_siguiente: z.boolean().default(true),
}).strict()

type Params = { params: Promise<{ id: string; periodo_id: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  const { id: institucion_id, periodo_id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()
  if (!isSuperadmin(session) && !hasRole(session, institucion_id, 'admin')) return Err.forbidden()

  const body = await request.json().catch(() => null)
  const parsed = CerrarSchema.safeParse(body ?? {})
  if (!parsed.success) return Err.validation(parsed.error.issues[0].message)

  const supabase = await createClient()

  const { data: periodoRaw, error: periodoErr } = await supabase
    .from('periodos')
    .select('*')
    .eq('id', periodo_id)
    .eq('institucion_id', institucion_id)
    .is('deleted_at', null)
    .single()
  if (periodoErr || !periodoRaw) return Err.notFound('Período no encontrado')
  const periodo = periodoRaw as { id: string; orden: number; año_lectivo_id: string; cerrado_at: string | null }

  // Atomic close: WHERE cerrado_at IS NULL prevents double-close race condition
  const { data: closed, error: updateErr } = await supabase
    .from('periodos')
    .update({ cerrado_at: new Date().toISOString(), cerrado_por: session.persona_id })
    .eq('id', periodo_id)
    .is('cerrado_at', null)
    .select('id')
  if (updateErr) return Err.server(updateErr.message)
  if (!closed || closed.length === 0) return Err.conflict('Período ya cerrado')

  let siguiente_activado = false

  if (parsed.data.activar_siguiente) {
    const { data: siguiente } = await supabase
      .from('periodos')
      .select('id')
      .eq('año_lectivo_id', periodo.año_lectivo_id)
      .eq('orden', periodo.orden + 1)
      .is('deleted_at', null)
      .maybeSingle()

    if (siguiente) {
      const { error: deactivateErr } = await supabase
        .from('periodos')
        .update({ activo: false })
        .eq('año_lectivo_id', periodo.año_lectivo_id)
        .eq('activo', true)
        .is('deleted_at', null)
      if (deactivateErr) return Err.server(deactivateErr.message)

      const { error: activateErr } = await supabase
        .from('periodos')
        .update({ activo: true })
        .eq('id', siguiente.id)
      if (activateErr) return Err.server(activateErr.message)

      siguiente_activado = true
    }
  }

  return ok({ cerrado: true, siguiente_activado })
}
