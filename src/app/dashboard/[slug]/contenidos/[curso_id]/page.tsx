import { requireSession, isSuperadmin, hasAnyRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { EmptyState } from '@/components/ui/empty-state'
import Link from 'next/link'
import { BookMarked, ChevronRight } from 'lucide-react'

type Params = { params: Promise<{ slug: string; curso_id: string }> }

export default async function ContenidosCursoPage({ params }: Params) {
  const { slug, curso_id } = await params
  const session = await requireSession()

  const supabase = await createClient()
  const { data: inst } = await supabase
    .from('instituciones')
    .select('id, modulo_contenidos')
    .eq('slug', slug)
    .is('deleted_at', null)
    .single()

  if (!inst) {
    if (isSuperadmin(session)) redirect('/dashboard/instituciones')
    notFound()
  }

  if (!inst.modulo_contenidos) notFound()

  const canAccess = isSuperadmin(session) || hasAnyRole(session, inst.id, ['admin', 'docente', 'responsable'])
  if (!canAccess) redirect(`/dashboard/${slug}`)

  const isEditor = isSuperadmin(session) || hasAnyRole(session, inst.id, ['admin', 'docente'])
  const isOnlyResponsable = !isEditor && hasAnyRole(session, inst.id, ['responsable'])

  const { data: curso } = await supabase
    .from('cursos')
    .select('*')
    .eq('id', curso_id)
    .eq('institucion_id', inst.id)
    .is('deleted_at', null)
    .single()

  if (!curso) notFound()

  type AlumnoSimple = { id: string; nombre: string; apellido: string | null }
  let alumnosEnCurso: AlumnoSimple[] = []

  if (isOnlyResponsable && session.persona_id) {
    type InscripcionRaw = { curso_id: string; activo: boolean; deleted_at: string | null }
    type VincRaw = { alumnos: AlumnoSimple & { alumno_inscripciones: InscripcionRaw[] } | null }

    const { data: vinculaciones } = await supabase
      .from('alumno_responsables')
      .select('alumnos(id, nombre, apellido, alumno_inscripciones(curso_id, activo, deleted_at))')
      .eq('persona_id', session.persona_id)
      .eq('institucion_id', inst.id)

    for (const v of (vinculaciones ?? []) as VincRaw[]) {
      const alumno = v.alumnos
      if (!alumno) continue
      const enrolled = alumno.alumno_inscripciones.some(i => i.curso_id === curso_id && i.activo && !i.deleted_at)
      if (enrolled) alumnosEnCurso.push({ id: alumno.id, nombre: alumno.nombre, apellido: alumno.apellido })
    }

    if (alumnosEnCurso.length === 0) redirect(`/dashboard/${slug}/contenidos`)
  }

  // Fetch materias con nombre del catálogo
  const { data: materiasRaw } = await supabase
    .from('materias')
    .select('id, materias_catalogo(nombre)')
    .eq('curso_id', curso_id)
    .eq('institucion_id', inst.id)
    .is('deleted_at', null)

  type MateriaRaw = { id: string; materias_catalogo: { nombre: string } | null }
  const materias = (materiasRaw ?? []) as MateriaRaw[]

  // Count publicado unidades and items per materia
  const materiaIds = materias.map(m => m.id)
  let countMap = new Map<string, { unidades: number; items: number }>()

  if (materiaIds.length > 0) {
    const { data: unidades } = await supabase
      .from('unidades')
      .select('id, materia_id, publicado')
      .in('materia_id', materiaIds)
      .is('deleted_at', null)

    const unidadesData = unidades ?? []
    const unidadIds = unidadesData.map(u => u.id)

    let itemCount = new Map<string, number>()
    if (unidadIds.length > 0) {
      const { data: items } = await supabase
        .from('contenidos')
        .select('unidad_id, publicado')
        .in('unidad_id', unidadIds)
        .eq('publicado', true)
        .is('deleted_at', null)

      for (const item of items ?? []) {
        itemCount.set(item.unidad_id, (itemCount.get(item.unidad_id) ?? 0) + 1)
      }
    }

    for (const m of materias) {
      const myUnidades = unidadesData.filter(u => u.materia_id === m.id && u.publicado)
      const myItems = myUnidades.reduce((acc, u) => acc + (itemCount.get(u.id) ?? 0), 0)
      countMap.set(m.id, { unidades: myUnidades.length, items: myItems })
    }
  }

  // Redirect if only one materia
  if (materias.length === 1) {
    redirect(`/dashboard/${slug}/contenidos/${curso_id}/${materias[0].id}`)
  }

  const alumnosLabel = alumnosEnCurso.length > 0
    ? alumnosEnCurso.map(a => a.apellido ? `${a.apellido}, ${a.nombre}` : a.nombre).join(' · ')
    : null

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
          <Link href={`/dashboard/${slug}/contenidos`} className="hover:text-foreground transition-colors">Contenidos</Link>
          <span>/</span>
          <span>{curso.nombre}</span>
        </div>
        <h1 className="text-2xl font-semibold">{curso.nombre}</h1>
        {alumnosLabel && (
          <p className="text-sm text-muted-foreground mt-0.5">{alumnosLabel}</p>
        )}
      </div>

      {materias.length === 0 ? (
        <EmptyState
          icon={BookMarked}
          title="Sin materias"
          description="Este curso no tiene materias registradas."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {materias.map(materia => {
            const counts = countMap.get(materia.id)
            const nombre = materia.materias_catalogo?.nombre ?? 'Materia'
            return (
              <Link key={materia.id} href={`/dashboard/${slug}/contenidos/${curso_id}/${materia.id}`}>
                <div className="flex items-center gap-3 rounded-lg border px-4 py-3.5 hover:bg-muted/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{nombre}</p>
                    {counts && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {counts.unidades > 0
                          ? `${counts.unidades} unidad${counts.unidades !== 1 ? 'es' : ''} · ${counts.items} material${counts.items !== 1 ? 'es' : ''}`
                          : 'Sin materiales publicados'}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
