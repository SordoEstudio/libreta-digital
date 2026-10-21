import { requireSession, isSuperadmin, hasAnyRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { EmptyState } from '@/components/ui/empty-state'
import Link from 'next/link'
import { BookMarked, ChevronRight } from 'lucide-react'

type Params = { params: Promise<{ slug: string }> }

export default async function ContenidosIndexPage({ params }: Params) {
  const { slug } = await params
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
  const isOnlyDocente = !isSuperadmin(session) && hasAnyRole(session, inst.id, ['docente']) && !hasAnyRole(session, inst.id, ['admin'])
  const isOnlyResponsable = !isEditor && hasAnyRole(session, inst.id, ['responsable'])

  const { data: años } = await supabase
    .from('años_lectivos')
    .select('id, activo')
    .eq('institucion_id', inst.id)
    .is('deleted_at', null)
    .order('activo', { ascending: false })

  const añoActivo = años?.find(a => a.activo) ?? años?.[0]

  let cursos: { id: string; nombre: string; nivel: string | null }[] = []
  if (añoActivo) {
    const { data } = await supabase
      .from('cursos')
      .select('*')
      .eq('institucion_id', inst.id)
      .eq('año_lectivo_id', añoActivo.id)
      .is('deleted_at', null)
      .order('nombre')
    cursos = (data ?? []).map(c => ({ id: c.id, nombre: c.nombre, nivel: c.nivel }))
  }

  type AlumnoSimple = { id: string; nombre: string; apellido: string | null }
  let visibleCursos = cursos
  const alumnosPorCurso = new Map<string, AlumnoSimple[]>()

  if (isOnlyDocente && cursos.length > 0) {
    const { data: materias } = await supabase
      .from('materias')
      .select('curso_id, materia_docentes(persona_id)')
      .in('curso_id', cursos.map(c => c.id))
      .is('deleted_at', null)
    const cursosConMisMateria = new Set(
      (materias ?? [])
        .filter(m => (m.materia_docentes as { persona_id: string }[]).some(d => d.persona_id === session.persona_id))
        .map(m => m.curso_id)
    )
    visibleCursos = cursos.filter(c => cursosConMisMateria.has(c.id))
  } else if (isOnlyResponsable && session.persona_id && cursos.length > 0) {
    type InscripcionRaw = { curso_id: string; activo: boolean; deleted_at: string | null }
    type VincRaw = { alumnos: { id: string; nombre: string; apellido: string | null; alumno_inscripciones: InscripcionRaw[] } | null }

    const { data: vinculaciones } = await supabase
      .from('alumno_responsables')
      .select('alumnos(id, nombre, apellido, alumno_inscripciones(curso_id, activo, deleted_at))')
      .eq('persona_id', session.persona_id)
      .eq('institucion_id', inst.id)

    const enrolledCursoIds = new Set<string>()
    for (const v of (vinculaciones ?? []) as VincRaw[]) {
      const alumno = v.alumnos
      if (!alumno) continue
      for (const i of alumno.alumno_inscripciones) {
        if (i.activo && !i.deleted_at) {
          enrolledCursoIds.add(i.curso_id)
          const existing = alumnosPorCurso.get(i.curso_id) ?? []
          if (!existing.find(a => a.id === alumno.id)) {
            existing.push({ id: alumno.id, nombre: alumno.nombre, apellido: alumno.apellido })
            alumnosPorCurso.set(i.curso_id, existing)
          }
        }
      }
    }
    visibleCursos = cursos.filter(c => enrolledCursoIds.has(c.id))
  }

  if (visibleCursos.length === 1) {
    redirect(`/dashboard/${slug}/contenidos/${visibleCursos[0].id}`)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Contenidos</h1>
        <p className="text-muted-foreground text-sm">Materiales por curso y materia</p>
      </div>

      {visibleCursos.length === 0 ? (
        <EmptyState
          icon={BookMarked}
          title="Sin cursos disponibles"
          description="No hay cursos activos en este año lectivo."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {visibleCursos.map(curso => {
            const alumnos = alumnosPorCurso.get(curso.id) ?? []
            return (
              <Link key={curso.id} href={`/dashboard/${slug}/contenidos/${curso.id}`}>
                <div className="flex items-center gap-3 rounded-lg border px-4 py-3.5 hover:bg-muted/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{curso.nombre}</p>
                    {curso.nivel && (
                      <p className="text-xs text-muted-foreground">{curso.nivel}</p>
                    )}
                    {alumnos.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {alumnos
                          .map(a => a.apellido ? `${a.apellido}, ${a.nombre}` : a.nombre)
                          .join(' · ')}
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
