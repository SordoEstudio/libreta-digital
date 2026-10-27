import { createAdminClient } from '@/lib/supabase/admin'

export type ActividadParams = {
  institucion_id: string
  persona_id?: string | null
  accion: string
  entidad?: string
  entidad_id?: string
  metadata?: Record<string, unknown> | null
}

export async function logActividad(params: ActividadParams): Promise<void> {
  const admin = createAdminClient()
  await admin.from('actividad_log').insert({
    institucion_id: params.institucion_id,
    persona_id: params.persona_id ?? null,
    accion: params.accion,
    entidad: params.entidad ?? null,
    entidad_id: params.entidad_id ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadata: (params.metadata ?? null) as any,
  })
}
