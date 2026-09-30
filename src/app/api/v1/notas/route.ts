import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasAnyRole } from '@/lib/auth'
import { created, Err } from '@/lib/api'
import { notificarNotaCargada } from '@/lib/notificaciones'

const CreateSchema = z.object({
  evaluacion_id: z.string().uuid(),
  alumno_id: z.string().uuid(),
  valor_numerico: z.number().optional(),
  valor_literal: z.string().optional(),
  observacion: z.string().optional(),
}).refine(d => d.valor_numerico !== undefined || d.valor_literal !== undefined, {
  message: 'Se requiere valor_numerico o valor_literal',
})

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return Err.unauthorized()
  if (!session.persona_id) return Err.forbidden()

  const body = await request.json().catch(() => null)
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) return Err.validation(parsed.error.issues[0].message)

  const supabase = await createClient()
  const { data: evaluacion } = await supabase
    .from('evaluaciones')
    .select('id, nombre, tipo, institucion_id, materias(id, materias_catalogo(nombre), escala_id, cursos(id, nombre, escala_id))')
    .eq('id', parsed.data.evaluacion_id)
    .single()

  if (!evaluacion) return Err.notFound('Evaluación no encontrada')
  if (!isSuperadmin(session) && !hasAnyRole(session, evaluacion.institucion_id, ['admin', 'docente'])) return Err.forbidden()

  const mat = evaluacion.materias as {
    id: string
    materias_catalogo: { nombre: string } | null
    escala_id: string | null
    cursos: { id: string; nombre: string; escala_id: string | null } | null
  } | null
  const escala_id = mat?.escala_id ?? mat?.cursos?.escala_id

  if (escala_id && parsed.data.valor_numerico !== undefined) {
    const { data: escala } = await supabase
      .from('escalas')
      .select('tipo, min_valor, max_valor')
      .eq('id', escala_id)
      .single()

    if (escala?.tipo === 'numerica') {
      const min = escala.min_valor ?? 0
      const max = escala.max_valor ?? 10
      if (parsed.data.valor_numerico < min || parsed.data.valor_numerico > max)
        return Err.validation(`Valor debe estar entre ${min} y ${max}`)
    }
  }

  const { data: alumno } = await supabase
    .from('alumnos')
    .select('nombre')
    .eq('id', parsed.data.alumno_id)
    .single()

  const { data, error } = await supabase
    .from('notas')
    .insert({
      evaluacion_id: parsed.data.evaluacion_id,
      alumno_id: parsed.data.alumno_id,
      valor_numerico: parsed.data.valor_numerico ?? null,
      valor_literal: parsed.data.valor_literal ?? null,
      observacion: parsed.data.observacion,
      institucion_id: evaluacion.institucion_id,
      docente_id: session.persona_id,
    })
    .select('id, valor_numerico, valor_literal, alumno_id, evaluacion_id')
    .single()

  if (error?.code === '23505') return Err.conflict('Ya existe una nota para este alumno en esta evaluación')
  if (error) return Err.server(error.message)

  const { data: inst } = await supabase
    .from('instituciones')
    .select('nombre')
    .eq('id', evaluacion.institucion_id)
    .single()

  const valor = (data.valor_numerico?.toString() ?? data.valor_literal) ?? '—'
  const materiaNombre = (mat?.materias_catalogo as { nombre: string } | null)?.nombre ?? ''

  void notificarNotaCargada({
    nota_id: data.id,
    alumno_id: data.alumno_id,
    alumno_nombre: alumno?.nombre ?? 'Alumno',
    evaluacion_nombre: evaluacion.nombre,
    evaluacion_tipo: evaluacion.tipo,
    materia_nombre: materiaNombre,
    curso_nombre: mat?.cursos?.nombre ?? '',
    valor,
    institucion_id: evaluacion.institucion_id,
    institucion_nombre: inst?.nombre ?? '',
  })

  return created(data)
}
