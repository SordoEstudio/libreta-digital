import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasAnyRole } from '@/lib/auth'
import { ok, Err } from '@/lib/api'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id: evaluacion_id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const supabase = await createClient()
  const { data: evaluacion } = await supabase
    .from('evaluaciones')
    .select('id, nombre, materias(curso_id, institucion_id)')
    .eq('id', evaluacion_id)
    .single()

  if (!evaluacion) return Err.notFound()
  const mat = evaluacion.materias as { curso_id: string; institucion_id: string } | null
  if (!mat) return Err.notFound()

  if (!isSuperadmin(session) && !hasAnyRole(session, mat.institucion_id, ['admin', 'docente']))
    return Err.forbidden()

  // Fetch students enrolled in this course via inscripciones
  const { data: inscripciones } = await supabase
    .from('alumno_inscripciones')
    .select('alumno_id')
    .eq('curso_id', mat.curso_id)
    .eq('activo', true)
    .is('deleted_at', null)

  const alumnoIds = (inscripciones ?? []).map(i => i.alumno_id)

  const { data: alumnos } = alumnoIds.length > 0
    ? await supabase
        .from('alumnos')
        .select('id, nombre')
        .in('id', alumnoIds)
        .eq('activo', true)
        .is('deleted_at', null)
        .order('nombre')
    : { data: [] }

  const { data: notas } = await supabase
    .from('notas')
    .select('id, alumno_id, valor_numerico, valor_literal, observacion')
    .eq('evaluacion_id', evaluacion_id)
    .is('deleted_at', null)

  const notaMap = new Map((notas ?? []).map(n => [n.alumno_id, n]))

  const result = (alumnos ?? []).map(a => ({
    alumno_id: a.id,
    nombre: a.nombre,
    nota: notaMap.get(a.id) ?? null,
  }))

  return ok(result)
}
