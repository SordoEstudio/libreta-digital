import { requireSession, isSuperadmin, hasAnyRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import AsistenciaEditor from './asistencia-editor'

type Props = {
  params: Promise<{ slug: string; materia_id: string }>
  searchParams: Promise<{ periodo_id?: string }>
}

export default async function AsistenciaPage({ params, searchParams }: Props) {
  const { slug, materia_id } = await params
  const { periodo_id: periodoParam } = await searchParams
  const session = await requireSession()

  const supabase = await createClient()
  const { data: inst } = await supabase
    .from('instituciones')
    .select('id')
    .eq('slug', slug)
    .is('deleted_at', null)
    .single()

  if (!inst) {
    if (isSuperadmin(session)) redirect('/dashboard/instituciones')
    notFound()
  }
  if (!isSuperadmin(session) && !hasAnyRole(session, inst.id, ['admin', 'docente']))
    redirect(`/dashboard/${slug}`)

  const { data: materia } = await supabase
    .from('materias')
    .select('id, materias_catalogo(nombre), cursos(id, nombre)')
    .eq('id', materia_id)
    .eq('institucion_id', inst.id)
    .is('deleted_at', null)
    .single()

  if (!materia) notFound()

  const mat = materia as {
    id: string
    materias_catalogo: { nombre: string } | null
    cursos: { id: string; nombre: string } | null
  }
  const materiaNombre = mat.materias_catalogo?.nombre ?? ''
  const cursoId = mat.cursos?.id ?? ''
  const cursoNombre = mat.cursos?.nombre ?? ''

  const { data: periodos } = await supabase
    .from('periodos')
    .select('id, nombre, cerrado_at')
    .eq('institucion_id', inst.id)
    .is('deleted_at', null)
    .order('orden')

  const periodosList = periodos ?? []
  const periodoId = periodosList.find(p => p.id === periodoParam)?.id ?? periodosList[0]?.id ?? null
  const selectedPeriodo = periodosList.find(p => p.id === periodoId)

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
        .select('id, nombre, apellido')
        .in('id', alumnoIds)
        .eq('activo', true)
        .is('deleted_at', null)
        .order('apellido', { nullsFirst: false })
        .order('nombre')
    : { data: [] }

  const { data: asistenciaExistente } = periodoId
    ? await supabase
        .from('asistencia_resumen')
        .select('alumno_id, total_clases, inasistencias_justificadas, inasistencias_injustificadas, observacion')
        .eq('materia_id', materia_id)
        .eq('periodo_id', periodoId)
    : { data: [] }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <span>{cursoNombre}</span>
          <span>/</span>
          <span>{materiaNombre}</span>
        </div>
        <h1 className="text-2xl font-semibold">Asistencia — {materiaNombre}</h1>
        <p className="text-sm text-muted-foreground">{alumnos?.length ?? 0} alumnos</p>
      </div>

      {selectedPeriodo?.cerrado_at && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          El período <strong>{selectedPeriodo.nombre}</strong> está cerrado. No se pueden editar datos.
        </div>
      )}

      <AsistenciaEditor
        key={periodoId ?? 'sin-periodo'}
        materiaId={materia_id}
        periodoId={periodoId}
        periodos={periodosList}
        alumnos={alumnos ?? []}
        asistenciaExistente={asistenciaExistente ?? []}
        slug={slug}
      />
    </div>
  )
}
