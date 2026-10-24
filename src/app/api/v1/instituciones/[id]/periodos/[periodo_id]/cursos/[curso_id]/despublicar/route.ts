import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasRole } from '@/lib/auth'
import { ok, Err } from '@/lib/api'

type Params = { params: Promise<{ id: string; periodo_id: string; curso_id: string }> }

export async function POST(_request: NextRequest, { params }: Params) {
  const { id: institucion_id, periodo_id, curso_id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()
  if (!isSuperadmin(session) && !hasRole(session, institucion_id, 'admin')) return Err.forbidden()

  const supabase = await createClient()

  // Verify period belongs to institution
  const { data: periodo, error: periodoErr } = await supabase
    .from('periodos')
    .select('id, cerrado_at, publicado_at')
    .eq('id', periodo_id)
    .eq('institucion_id', institucion_id)
    .is('deleted_at', null)
    .single()
  if (periodoErr || !periodo) return Err.notFound('Período no encontrado')

  // Verify curso belongs to institution via años_lectivos
  const { data: cursoRaw, error: cursoErr } = await supabase
    .from('cursos')
    .select('*')
    .eq('id', curso_id)
    .is('deleted_at', null)
    .single()
  if (cursoErr || !cursoRaw) return Err.notFound('Curso no encontrado')
  const curso = cursoRaw as { año_lectivo_id: string }

  const { data: anoLectivo, error: anoErr } = await supabase
    .from('años_lectivos')
    .select('id')
    .eq('id', curso.año_lectivo_id)
    .eq('institucion_id', institucion_id)
    .is('deleted_at', null)
    .single()
  if (anoErr || !anoLectivo) return Err.notFound('Curso no pertenece a esta institución')

  // Fetch per-curso override
  const { data: override } = await supabase
    .from('periodo_cierre_cursos')
    .select('cerrado_at, publicado_at, abierto_at')
    .eq('periodo_id', periodo_id)
    .eq('curso_id', curso_id)
    .maybeSingle()

  // Guard: curso must be publicado (either via override or period-level)
  if (override?.publicado_at == null && periodo.publicado_at == null) {
    return Err.conflict('El curso no está publicado')
  }

  const { error: upsertErr } = await supabase
    .from('periodo_cierre_cursos')
    .upsert(
      {
        periodo_id,
        curso_id,
        publicado_at: null,
        cerrado_at: override?.cerrado_at ?? null,
        abierto_at: null,
      },
      { onConflict: 'periodo_id,curso_id' }
    )
  if (upsertErr) return Err.server(upsertErr.message)

  return ok({ despublicado: true })
}
