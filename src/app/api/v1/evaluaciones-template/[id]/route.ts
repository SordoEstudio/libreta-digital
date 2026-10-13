import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasRole } from '@/lib/auth'
import { ok, Err } from '@/lib/api'

const PatchSchema = z.object({
  nombre: z.string().min(1).optional(),
  tipo: z.enum(['parcial', 'final', 'recuperatorio', 'tp', 'concepto']).optional(),
  peso: z.number().positive().optional(),
  orden: z.number().int().positive().optional(),
  periodo_id: z.string().uuid().optional(),
  fecha: z.string().date().nullable().optional(),
  sync: z.boolean().default(false),
}).strict()

type Params = { params: Promise<{ id: string }> }

async function resolveTemplate(id: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('evaluaciones_template')
    .select('id, institucion_id, nombre, tipo, peso, orden, periodo_id, fecha')
    .eq('id', id)
    .is('deleted_at', null)
    .single()
  return { supabase, template: data }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const { supabase, template } = await resolveTemplate(id)
  if (!template) return Err.notFound()
  if (!isSuperadmin(session) && !hasRole(session, template.institucion_id, 'admin'))
    return Err.forbidden()

  const body = await request.json().catch(() => null)
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) return Err.validation(parsed.error.issues[0].message)

  const { sync, fecha, ...rest } = parsed.data
  const updateData: Record<string, unknown> = { ...rest }
  if (fecha !== undefined) updateData.fecha = fecha

  if (Object.keys(updateData).length === 0 && !sync) return ok({ id })

  if (Object.keys(updateData).length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase
      .from('evaluaciones_template')
      .update(updateData as any)
      .eq('id', id)

    if (error) return Err.server(error.message)
  }

  let synced = 0
  if (sync && Object.keys(updateData).length > 0) {
    // Sync fields to all active instances (exclude periodo_id — changing period on instances is destructive)
    const syncFields: Record<string, unknown> = {}
    if (updateData.nombre !== undefined) syncFields.nombre = updateData.nombre
    if (updateData.tipo !== undefined) syncFields.tipo = updateData.tipo
    if (updateData.peso !== undefined) syncFields.peso = updateData.peso
    if (updateData.orden !== undefined) syncFields.orden = updateData.orden
    if (updateData.fecha !== undefined) syncFields.fecha = updateData.fecha

    if (Object.keys(syncFields).length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: updated } = await supabase
        .from('evaluaciones')
        .update(syncFields as any)
        .eq('template_id', id)
        .is('deleted_at', null)
        .select('id')

      synced = updated?.length ?? 0
    }
  }

  return ok({ id, synced })
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const { supabase, template } = await resolveTemplate(id)
  if (!template) return Err.notFound()
  if (!isSuperadmin(session) && !hasRole(session, template.institucion_id, 'admin'))
    return Err.forbidden()

  const now = new Date().toISOString()

  // Cascade: soft-delete all instances
  await supabase
    .from('evaluaciones')
    .update({ deleted_at: now })
    .eq('template_id', id)
    .is('deleted_at', null)

  // Soft-delete the template
  const { error } = await supabase
    .from('evaluaciones_template')
    .update({ deleted_at: now })
    .eq('id', id)

  if (error) return Err.server(error.message)
  return ok({ deleted: true })
}
