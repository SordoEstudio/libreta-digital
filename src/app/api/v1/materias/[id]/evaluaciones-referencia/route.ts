import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasAnyRole } from '@/lib/auth'
import { ok, created, Err } from '@/lib/api'

const CreateSchema = z.object({
  nombre: z.string().min(1).max(200),
  tipo: z.enum(['numerica', 'conceptual']),
  fecha: z.string().date().optional().nullable(),
  periodo_id: z.string().uuid().optional().nullable(),
  dimension_ids: z.array(z.string().uuid()).optional(),
}).strict()

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
    .from('evaluaciones_referencia')
    .select('id, nombre, tipo, fecha, periodo_id, created_at, evaluacion_referencia_dimensiones(dimension_id)')
    .eq('materia_id', materia_id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) return Err.server(error.message)
  return ok(data)
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id: materia_id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()
  if (!session.persona_id) return Err.forbidden()

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

  const { data, error } = await supabase
    .from('evaluaciones_referencia')
    .insert({
      materia_id,
      institucion_id: materia.institucion_id,
      nombre: parsed.data.nombre,
      tipo: parsed.data.tipo,
      docente_id: session.persona_id,
      ...(parsed.data.fecha ? { fecha: parsed.data.fecha } : {}),
      ...(parsed.data.periodo_id ? { periodo_id: parsed.data.periodo_id } : {}),
    })
    .select('id, nombre, tipo, fecha, periodo_id, created_at')
    .single()

  if (error) return Err.server(error.message)

  if (parsed.data.dimension_ids?.length) {
    await supabase.from('evaluacion_referencia_dimensiones').insert(
      parsed.data.dimension_ids.map(dimension_id => ({ evaluacion_ref_id: data.id, dimension_id }))
    )
  }

  return created({ ...data, evaluacion_referencia_dimensiones: (parsed.data.dimension_ids ?? []).map(d => ({ dimension_id: d })) })
}
