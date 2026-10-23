import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasAnyRole } from '@/lib/auth'
import { ok, Err } from '@/lib/api'
import { isPeriodoCerrado } from '@/lib/cierre-periodo'

const PatchSchema = z.object({
  nombre: z.string().min(1).optional(),
  tipo: z.enum(['parcial', 'final', 'recuperatorio', 'tp', 'concepto']).optional(),
  peso: z.number().positive().optional(),
  orden: z.number().int().positive().optional(),
  periodo_id: z.string().uuid().nullable().optional(),
  fecha: z.string().date().nullable().optional(),
  permite_recuperatorio: z.boolean().optional(),
  dimension_ids: z.array(z.string().uuid()).optional(),
}).strict()

type Params = { params: Promise<{ id: string }> }

async function resolveEvaluacion(id: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('evaluaciones')
    .select('id, materia_id, periodo_id, materias(institucion_id, curso_id)')
    .eq('id', id)
    .is('deleted_at', null)
    .single()
  return { supabase, evaluacion: data }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const { supabase, evaluacion } = await resolveEvaluacion(id)
  if (!evaluacion) return Err.notFound()

  const mat = evaluacion.materias as { institucion_id: string; curso_id: string } | null
  if (!mat) return Err.notFound()
  if (!isSuperadmin(session) && !hasAnyRole(session, mat.institucion_id, ['admin', 'docente']))
    return Err.forbidden()

  if (evaluacion.periodo_id) {
    const { data: periodo } = await supabase
      .from('periodos')
      .select('cerrado_at')
      .eq('id', evaluacion.periodo_id)
      .is('deleted_at', null)
      .single()
    if (isPeriodoCerrado(periodo?.cerrado_at)) return Err.conflict('Período cerrado')
  }

  const body = await request.json().catch(() => null)
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) return Err.validation(parsed.error.issues[0].message)

  const { fecha, dimension_ids, ...rest } = parsed.data
  const updateData: Record<string, unknown> = { ...rest }

  // Resolve null periodo_id → annual period (periodo_id NOT NULL after migration)
  if (updateData.periodo_id === null) {
    const { data: curso } = await supabase
      .from('cursos')
      .select('año_lectivo_id')
      .eq('id', mat.curso_id)
      .is('deleted_at', null)
      .single()
    if (curso) {
      const { data: periodoAnual } = await supabase
        .from('periodos')
        .select('id')
        .eq('año_lectivo_id', curso.año_lectivo_id)
        .eq('tipo', 'anual')
        .is('deleted_at', null)
        .single()
      if (periodoAnual) updateData.periodo_id = periodoAnual.id
      else delete updateData.periodo_id
    } else {
      delete updateData.periodo_id
    }
  }
  if (fecha !== undefined) updateData.fecha = fecha

  if (Object.keys(updateData).length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await supabase
      .from('evaluaciones')
      .update(updateData as any)
      .eq('id', id)
      .select('id, nombre, tipo, peso, orden, periodo_id, fecha')
      .single()
    if (error) return Err.server(error.message)
  }

  if (dimension_ids !== undefined) {
    await supabase.from('evaluacion_dimensiones').delete().eq('evaluacion_id', id)
    if (dimension_ids.length > 0) {
      await supabase.from('evaluacion_dimensiones').insert(
        dimension_ids.map(did => ({ evaluacion_id: id, dimension_id: did }))
      )
    }
  }

  return ok({ id })
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const { supabase, evaluacion } = await resolveEvaluacion(id)
  if (!evaluacion) return Err.notFound()

  const mat = evaluacion.materias as { institucion_id: string } | null
  if (!mat) return Err.notFound()
  if (!isSuperadmin(session) && !hasAnyRole(session, mat.institucion_id, ['admin', 'docente']))
    return Err.forbidden()

  if (evaluacion.periodo_id) {
    const { data: periodo } = await supabase
      .from('periodos')
      .select('cerrado_at')
      .eq('id', evaluacion.periodo_id)
      .is('deleted_at', null)
      .single()
    if (isPeriodoCerrado(periodo?.cerrado_at)) return Err.conflict('Período cerrado')
  }

  // Cascade: soft-delete notas first
  await supabase
    .from('notas')
    .update({ deleted_at: new Date().toISOString() })
    .eq('evaluacion_id', id)
    .is('deleted_at', null)

  const { error } = await supabase
    .from('evaluaciones')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return Err.server(error.message)
  return ok({ deleted: true })
}
