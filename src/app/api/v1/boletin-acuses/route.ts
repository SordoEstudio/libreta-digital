import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/auth'
import { created, Err } from '@/lib/api'

const PostSchema = z.object({
  alumno_id: z.string().uuid(),
  periodo_ids: z.array(z.string().uuid()).min(1).max(20),
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

  // Verify all periods are actually closed (prevent confirming open periods)
  const admin = createAdminClient()
  const { data: periodos } = await admin
    .from('periodos')
    .select('id')
    .in('id', periodo_ids)
    .not('cerrado_at', 'is', null)
    .is('deleted_at', null)

  const validIds = new Set((periodos ?? []).map(p => p.id))
  if (periodo_ids.some(id => !validIds.has(id)))
    return Err.validation('Uno o más períodos no están cerrados')

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
