import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSession, hasRole, isSuperadmin } from '@/lib/auth'
import { created, ok, Err } from '@/lib/api'
import { logActividad } from '@/lib/actividad'

const PostSchema = z.object({
  alumno_id: z.string().uuid(),
  persona_id: z.string().uuid(),
  periodo_id: z.string().uuid(),
  institucion_id: z.string().uuid(),
}).strict()

const DeleteSchema = z.object({
  alumno_id: z.string().uuid(),
  persona_id: z.string().uuid(),
  periodo_id: z.string().uuid(),
  institucion_id: z.string().uuid(),
}).strict()

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const body = await request.json().catch(() => null)
  const parsed = PostSchema.safeParse(body)
  if (!parsed.success) return Err.validation(parsed.error.issues[0].message)

  const { alumno_id, persona_id, periodo_id, institucion_id } = parsed.data

  if (!isSuperadmin(session) && !hasRole(session, institucion_id, 'admin'))
    return Err.forbidden()

  const admin = createAdminClient()

  const { error } = await admin
    .from('boletin_acuses')
    .upsert(
      { alumno_id, periodo_id, persona_id, confirmado_por: session.persona_id },
      { onConflict: 'alumno_id,periodo_id,persona_id', ignoreDuplicates: false }
    )

  if (error) return Err.server(error.message)

  logActividad({
    institucion_id,
    persona_id: session.persona_id,
    accion: 'confirmar_boletin',
    entidad: 'boletin_acuse',
    entidad_id: alumno_id,
    metadata: { alumno_id, persona_id, periodo_id },
  })

  return created({ confirmed: 1 })
}

export async function DELETE(request: NextRequest) {
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const body = await request.json().catch(() => null)
  const parsed = DeleteSchema.safeParse(body)
  if (!parsed.success) return Err.validation(parsed.error.issues[0].message)

  const { alumno_id, persona_id, periodo_id, institucion_id } = parsed.data

  if (!isSuperadmin(session) && !hasRole(session, institucion_id, 'admin'))
    return Err.forbidden()

  const admin = createAdminClient()

  const { error } = await admin
    .from('boletin_acuses')
    .delete()
    .eq('alumno_id', alumno_id)
    .eq('persona_id', persona_id)
    .eq('periodo_id', periodo_id)

  if (error) return Err.server(error.message)

  logActividad({
    institucion_id,
    persona_id: session.persona_id,
    accion: 'quitar_confirmacion_boletin',
    entidad: 'boletin_acuse',
    entidad_id: alumno_id,
    metadata: { alumno_id, persona_id, periodo_id },
  })

  return ok({ deleted: 1 })
}
