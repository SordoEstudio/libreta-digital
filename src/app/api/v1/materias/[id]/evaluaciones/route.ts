import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasAnyRole } from '@/lib/auth'
import { ok, created, Err } from '@/lib/api'
import { isPeriodoCerrado } from '@/lib/cierre-periodo'

const CreateSchema = z.object({
  nombre: z.string().min(1),
  tipo: z.enum(['parcial', 'final', 'recuperatorio', 'tp', 'concepto']),
  peso: z.number().positive().default(1),
  orden: z.number().int().positive().default(1),
  periodo_id: z.string().uuid().optional().nullable(),
  fecha: z.string().date().optional().nullable(),
  permite_recuperatorio: z.boolean().default(false),
  dimension_ids: z.array(z.string().uuid()).optional(),
})

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id: materia_id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const supabase = await createClient()
  const { data: materia } = await supabase
    .from('materias')
    .select('institucion_id')
    .eq('id', materia_id)
    .is('deleted_at', null)
    .single()

  if (!materia) return Err.notFound('Materia no encontrada')
  if (!isSuperadmin(session) && !hasAnyRole(session, materia.institucion_id, ['admin', 'docente']))
    return Err.forbidden()

  const { data, error } = await supabase
    .from('evaluaciones')
    .select('id, nombre, tipo, peso, orden, periodo_id, created_at, periodos(id, nombre), evaluacion_dimensiones(dimension_id)')
    .eq('materia_id', materia_id)
    .is('deleted_at', null)
    .order('orden', { ascending: true })

  if (error) return Err.server(error.message)
  return ok(data)
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id: materia_id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const supabase = await createClient()
  const { data: materia } = await supabase
    .from('materias')
    .select('institucion_id')
    .eq('id', materia_id)
    .is('deleted_at', null)
    .single()

  if (!materia) return Err.notFound('Materia no encontrada')
  if (!isSuperadmin(session) && !hasAnyRole(session, materia.institucion_id, ['admin', 'docente']))
    return Err.forbidden()

  const body = await request.json().catch(() => null)
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) return Err.validation(parsed.error.issues[0].message)

  if (parsed.data.periodo_id) {
    const { data: periodo } = await supabase
      .from('periodos')
      .select('cerrado_at')
      .eq('id', parsed.data.periodo_id)
      .is('deleted_at', null)
      .single()
    if (isPeriodoCerrado(periodo?.cerrado_at)) return Err.conflict('Período cerrado')
  }

  const { data, error } = await supabase
    .from('evaluaciones')
    .insert({
      materia_id,
      institucion_id: materia.institucion_id,
      nombre: parsed.data.nombre,
      tipo: parsed.data.tipo,
      peso: parsed.data.peso,
      orden: parsed.data.orden,
      permite_recuperatorio: parsed.data.permite_recuperatorio,
      ...(parsed.data.periodo_id ? { periodo_id: parsed.data.periodo_id } : {}),
      ...(parsed.data.fecha ? { fecha: parsed.data.fecha } : {}),
    })
    .select('id, nombre, tipo, peso, orden, periodo_id, fecha, created_at')
    .single()

  if (error) return Err.server(error.message)

  if (parsed.data.dimension_ids?.length) {
    await supabase.from('evaluacion_dimensiones').insert(
      parsed.data.dimension_ids.map(did => ({ evaluacion_id: data.id, dimension_id: did }))
    )
  }

  return created(data)
}
