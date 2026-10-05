import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasAnyRole } from '@/lib/auth'
import { ok, created, Err } from '@/lib/api'

const CreateSchema = z.object({
  nombre: z.string().min(1),
  tipo: z.enum(['parcial', 'final', 'recuperatorio', 'tp', 'concepto']),
  peso: z.number().positive().default(1),
  orden: z.number().int().positive().default(1),
  periodo_id: z.string().uuid(),
  fecha: z.string().date().optional().nullable(),
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
    .select('id, nombre, tipo, peso, orden, periodo_id, created_at, periodos(id, nombre)')
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

  const { data, error } = await supabase
    .from('evaluaciones')
    .insert({
      materia_id,
      institucion_id: materia.institucion_id,
      nombre: parsed.data.nombre,
      tipo: parsed.data.tipo,
      peso: parsed.data.peso,
      orden: parsed.data.orden,
      periodo_id: parsed.data.periodo_id,
      ...(parsed.data.fecha ? { fecha: parsed.data.fecha } : {}),
    })
    .select('id, nombre, tipo, peso, orden, periodo_id, fecha, created_at')
    .single()

  if (error) return Err.server(error.message)
  return created(data)
}
