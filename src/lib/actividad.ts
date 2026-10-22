import { createAdminClient } from '@/lib/supabase/admin'

export type ActividadParams = {
  institucion_id: string
  persona_id?: string | null
  accion: string
  entidad?: string
  entidad_id?: string
  metadata?: Record<string, unknown>
}

export function logActividad(params: ActividadParams): void {
  const admin = createAdminClient()
  void admin.from('actividad_log').insert({
    institucion_id: params.institucion_id,
    persona_id: params.persona_id ?? null,
    accion: params.accion,
    entidad: params.entidad ?? null,
    entidad_id: params.entidad_id ?? null,
    metadata: params.metadata ?? null,
  })
}
