import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasAnyRole } from '@/lib/auth'
import { ok, Err } from '@/lib/api'
import { notificarNotaCargada } from '@/lib/notificaciones'

const BulkSchema = z.object({
  evaluacion_id: z.string().uuid(),
  notas: z.array(z.object({
    alumno_id: z.string().uuid(),
    valor_numerico: z.number().nullable().optional(),
    valor_literal: z.string().nullable().optional(),
    observacion: z.string().optional(),
  })).min(1),
})

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return Err.unauthorized()
  if (!session.persona_id) return Err.forbidden()

  const body = await request.json().catch(() => null)
  const parsed = BulkSchema.safeParse(body)
  if (!parsed.success) return Err.validation(parsed.error.issues[0].message)

  const { evaluacion_id, notas } = parsed.data
  const supabase = await createClient()

  const { data: evaluacion } = await supabase
    .from('evaluaciones')
    .select('id, nombre, tipo, institucion_id, materias(materias_catalogo(nombre), cursos(nombre))')
    .eq('id', evaluacion_id)
    .single()

  if (!evaluacion) return Err.notFound('Evaluación no encontrada')
  if (!isSuperadmin(session) && !hasAnyRole(session, evaluacion.institucion_id, ['admin', 'docente'])) return Err.forbidden()

  const mat = evaluacion.materias as { materias_catalogo: { nombre: string } | null; cursos: { nombre: string } | null } | null

  const toUpsert = notas
    .filter(n => n.valor_numerico != null || n.valor_literal != null)
    .map(n => ({
      evaluacion_id,
      alumno_id: n.alumno_id,
      valor_numerico: n.valor_numerico ?? null,
      valor_literal: n.valor_literal ?? null,
      observacion: n.observacion,
      institucion_id: evaluacion.institucion_id,
      docente_id: session.persona_id!,
    }))

  if (toUpsert.length === 0) return ok({ upserted: 0, skipped: notas.length })

  const { data, error } = await supabase
    .from('notas')
    .upsert(toUpsert, { onConflict: 'evaluacion_id,alumno_id' })
    .select('id, alumno_id, valor_numerico, valor_literal')

  if (error) return Err.server(error.message)

  const { data: alumnos } = await supabase
    .from('alumnos')
    .select('id, nombre')
    .in('id', data.map(n => n.alumno_id))

  const alumnoMap = new Map((alumnos ?? []).map(a => [a.id, a.nombre]))
  const { data: inst } = await supabase
    .from('instituciones')
    .select('nombre')
    .eq('id', evaluacion.institucion_id)
    .single()

  void Promise.allSettled(
    data.map(nota =>
      notificarNotaCargada({
        nota_id: nota.id,
        alumno_id: nota.alumno_id,
        alumno_nombre: alumnoMap.get(nota.alumno_id) ?? 'Alumno',
        evaluacion_nombre: evaluacion.nombre,
        evaluacion_tipo: evaluacion.tipo,
        materia_nombre: (mat?.materias_catalogo as { nombre: string } | null)?.nombre ?? '',
        curso_nombre: mat?.cursos?.nombre ?? '',
        valor: (nota.valor_numerico?.toString() ?? nota.valor_literal) ?? '—',
        institucion_id: evaluacion.institucion_id,
        institucion_nombre: inst?.nombre ?? '',
      })
    )
  )

  return ok({ upserted: data.length, skipped: notas.length - toUpsert.length })
}
