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

  const { data: periodoRaw, error: periodoErr } = await supabase
    .from('periodos')
    .select('*')
    .eq('id', periodo_id)
    .eq('institucion_id', institucion_id)
    .is('deleted_at', null)
    .single()
  if (periodoErr || !periodoRaw) return Err.notFound('Período no encontrado')
  const periodo = periodoRaw as { id: string; nombre: string; cerrado_at: string | null; publicado_at: string | null; año_lectivo_id: string }
  if (!periodo.cerrado_at) return Err.validation('El período debe estar cerrado antes de publicar')
  if (periodo.publicado_at) return Err.conflict('El período ya está publicado')

  const { error } = await supabase
    .from('periodos')
    .update({ publicado_at: new Date().toISOString() })
    .eq('id', periodo_id)
  if (error) return Err.server(error.message)

  logActividad({
    institucion_id,
    persona_id: session.persona_id,
    accion: 'publicar_periodo',
    entidad: 'periodos',
    entidad_id: periodo_id,
    metadata: { periodo_nombre: periodo.nombre },
  })

  // Sync periodo_cierre_cursos for all cursos in this año_lectivo
  const { data: cursos } = await supabase
    .from('cursos')
    .select('id')
    .eq('año_lectivo_id', periodo.año_lectivo_id)
    .is('deleted_at', null)

  if (cursos && cursos.length > 0) {
    await supabase
      .from('periodo_cierre_cursos')
      .upsert(
        cursos.map(c => ({
          periodo_id,
          curso_id: c.id,
          publicado_at: new Date().toISOString(),
          abierto_at: null,
        })),
        { onConflict: 'periodo_id,curso_id', ignoreDuplicates: false }
      )
  }

  return ok({ publicado: true })
}
