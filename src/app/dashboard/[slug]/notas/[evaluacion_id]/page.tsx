import { requireSession, isSuperadmin, hasAnyRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { NotasEditor } from './notas-editor'

type Params = { params: Promise<{ slug: string; evaluacion_id: string }> }

export default async function NotasPage({ params }: Params) {
  const { slug, evaluacion_id } = await params
  const session = await requireSession()

  const supabase = await createClient()
  const { data: inst } = await supabase
    .from('instituciones')
    .select('id')
    .eq('slug', slug)
    .single()

  if (!inst) {
    if (isSuperadmin(session)) redirect('/dashboard/instituciones')
    notFound()
  }
  if (!isSuperadmin(session) && !hasAnyRole(session, inst.id, ['admin', 'docente'])) redirect('/dashboard')

  const { data: evaluacion } = await supabase
    .from('evaluaciones')
    .select('id, nombre, tipo, peso, materias(id, materias_catalogo(nombre), cursos(id, nombre))')
    .eq('id', evaluacion_id)
    .single()

  if (!evaluacion) notFound()

  const mat = evaluacion.materias as {
    id: string
    materias_catalogo: { nombre: string } | null
    cursos: { id: string; nombre: string } | null
  } | null
  if (!mat) notFound()

  const materiaNombre = mat.materias_catalogo?.nombre ?? ''
  const cursoId = mat.cursos?.id ?? ''

  // Fetch students enrolled in this course (via inscripciones)
  const { data: inscripciones } = await supabase
    .from('alumno_inscripciones')
    .select('alumno_id')
    .eq('curso_id', cursoId)
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

  const { data: notasExistentes } = await supabase
    .from('notas')
    .select('id, alumno_id, valor_numerico, valor_literal, observacion')
    .eq('evaluacion_id', evaluacion_id)
    .is('deleted_at', null)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <span>{mat.cursos?.nombre}</span>
          <span>/</span>
          <span>{materiaNombre}</span>
        </div>
        <h1 className="text-2xl font-semibold">{evaluacion.nombre}</h1>
        <p className="text-sm text-muted-foreground capitalize">{evaluacion.tipo}</p>
      </div>

      <NotasEditor
        evaluacionId={evaluacion_id}
        alumnos={alumnos ?? []}
        notasExistentes={notasExistentes ?? []}
        slug={slug}
      />
    </div>
  )
}
