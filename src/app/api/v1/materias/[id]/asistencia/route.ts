import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasAnyRole, hasRole } from '@/lib/auth'
import { ok, Err } from '@/lib/api'
import { isPeriodoCerrado } from '@/lib/cierre-periodo'

const RegistroSchema = z.object({
  alumno_id:                    z.string().uuid(),
  total_clases:                 z.number().int().min(0),
  inasistencias_justificadas:   z.number().int().min(0),
  inasistencias_injustificadas: z.number().int().min(0),
  observacion:                  z.string().max(500).optional().nullable(),
})

const BulkSchema = z.object({
  periodo_id: z.string().uuid(),
  registros:  z.array(RegistroSchema).min(1),
})

type Params = { params: Promise<{ id: string }> }

async function resolveMateria(materia_id: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('materias')
    .select('id, institucion_id')
    .eq('id', materia_id)
    .is('deleted_at', null)
    .single()
  return { supabase, materia: data }
}

export async function GET(req: NextRequest, { params }: Params) {
  const { id: materia_id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const { supabase, materia } = await resolveMateria(materia_id)
  if (!materia) return Err.notFound('Materia no encontrada')
  if (!isSuperadmin(session) && !hasAnyRole(session, materia.institucion_id, ['admin', 'docente', 'responsable']))
    return Err.forbidden()

  const periodo_id = req.nextUrl.searchParams.get('periodo_id')
  if (!periodo_id) return Err.validation('periodo_id requerido')

  const { data, error } = await supabase
    .from('asistencia_resumen')
    .select('alumno_id, total_clases, inasistencias_justificadas, inasistencias_injustificadas, observacion')
    .eq('materia_id', materia_id)
    .eq('periodo_id', periodo_id)

  if (error) return Err.server(error.message)
  return ok(data)
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id: materia_id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const { supabase, materia } = await resolveMateria(materia_id)
  if (!materia) return Err.notFound('Materia no encontrada')
  if (!isSuperadmin(session) && !hasAnyRole(session, materia.institucion_id, ['admin', 'docente']))
    return Err.forbidden()

  // Docente solo puede cargar asistencia de su propia materia
  if (!isSuperadmin(session) && !hasRole(session, materia.institucion_id, 'admin')) {
    if (!session.persona_id) return Err.forbidden()
    const { data: assignment } = await supabase
      .from('materia_docentes')
      .select('persona_id')
      .eq('materia_id', materia_id)
      .eq('persona_id', session.persona_id)
      .maybeSingle()
    if (!assignment) return Err.forbidden()
  }

  const body = await request.json().catch(() => null)
  const parsed = BulkSchema.safeParse(body)
  if (!parsed.success) return Err.validation(parsed.error.issues[0].message)

  const { data: periodo } = await supabase
    .from('periodos')
    .select('cerrado_at')
    .eq('id', parsed.data.periodo_id)
    .is('deleted_at', null)
    .single()
  if (isPeriodoCerrado(periodo?.cerrado_at)) return Err.conflict('Período cerrado')

  const rows = parsed.data.registros.map(r => ({
    institucion_id:               materia.institucion_id,
    alumno_id:                    r.alumno_id,
    materia_id,
    periodo_id:                   parsed.data.periodo_id,
    total_clases:                 r.total_clases,
    inasistencias_justificadas:   r.inasistencias_justificadas,
    inasistencias_injustificadas: r.inasistencias_injustificadas,
    observacion:                  r.observacion ?? null,
    updated_at:                   new Date().toISOString(),
  }))

  const { error } = await supabase
    .from('asistencia_resumen')
    .upsert(rows, { onConflict: 'alumno_id,periodo_id,materia_id' })

  if (error) return Err.server(error.message)
  return ok({ upserted: rows.length })
}
