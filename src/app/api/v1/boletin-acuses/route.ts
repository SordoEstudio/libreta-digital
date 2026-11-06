import { NextRequest } from 'next/server'
import { z } from 'zod'
import { zId } from '@/lib/validators'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/auth'
import { created, Err } from '@/lib/api'
import { isPublicadoParaCurso } from '@/lib/cierre-periodo'
import type { PeriodoCierreOverride } from '@/lib/cierre-periodo'

const PostSchema = z.object({
  alumno_id: zId(),
  periodo_ids: z.array(zId()).min(1).max(20),
}).strict()

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return Err.unauthorized()
  if (!session.persona_id) return Err.forbidden()

  const body = await request.json().catch(() => null)
  const parsed = PostSchema.safeParse(body)
  if (!parsed.success) return Err.validation(parsed.error.issues[0].message)

  const { alumno_id, periodo_ids } = parsed.data

  const supabase = await createClient()

  // Verify this responsable is linked to the alumno
  const { data: vinculacion } = await supabase
    .from('alumno_responsables')
    .select('alumno_id')
    .eq('alumno_id', alumno_id)
    .eq('persona_id', session.persona_id)
    .maybeSingle()

  if (!vinculacion) return Err.forbidden()

  // Verify all periods are actually published — check both global and per-course publication
  const admin = createAdminClient()

  // Get alumno's active curso inscriptions
  const { data: inscripciones } = await admin
    .from('alumno_inscripciones')
    .select('curso_id')
    .eq('alumno_id', alumno_id)
    .eq('activo', true)
    .is('deleted_at', null)
  const cursoIds = (inscripciones ?? []).map(i => i.curso_id)

  // Fetch periods with their global publicado_at
  const { data: periodos } = await admin
    .from('periodos')
    .select('id, publicado_at')
    .in('id', periodo_ids)
    .is('deleted_at', null)
  const periodoMap = new Map((periodos ?? []).map(p => [p.id, p.publicado_at as string | null]))

  // Fetch per-course overrides for these periods + alumno's courses
  const { data: overrides } = cursoIds.length > 0
    ? await admin
        .from('periodo_cierre_cursos')
        .select('periodo_id, curso_id, cerrado_at, publicado_at, abierto_at')
        .in('periodo_id', periodo_ids)
        .in('curso_id', cursoIds)
    : { data: [] }

  // For each period, check if published for at least one of the alumno's courses
  const isPublished = (periodoId: string): boolean => {
    const globalPublicadoAt = periodoMap.get(periodoId) ?? null
    if (cursoIds.length === 0) return globalPublicadoAt != null
    return cursoIds.some(cursoId => {
      const override = (overrides ?? []).find(o => o.periodo_id === periodoId && o.curso_id === cursoId) ?? null
      return isPublicadoParaCurso(globalPublicadoAt, override as PeriodoCierreOverride)
    })
  }

  if (periodo_ids.some(id => !isPublished(id)))
    return Err.validation('Uno o más períodos no están publicados')

  // Batch upsert — ON CONFLICT DO NOTHING (idempotent)
  const rows = periodo_ids.map(periodo_id => ({
    alumno_id,
    periodo_id,
    persona_id: session.persona_id as string,
  }))

  const { error } = await supabase
    .from('boletin_acuses')
    .upsert(rows, { onConflict: 'alumno_id,periodo_id,persona_id', ignoreDuplicates: true })

  if (error) return Err.server(error.message)

  return created({ confirmed: rows.length })
}
