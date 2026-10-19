import { requireSession, isSuperadmin, hasAnyRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import Link from 'next/link'
import { BookMarked } from 'lucide-react'

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

  // Fetch cursos with año_lectivo active
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

  // For docente (not admin): only show cursos they teach in
  let visibleCursos = cursos
  if (!isEditor || (!isSuperadmin(session) && hasAnyRole(session, inst.id, ['docente']) && !hasAnyRole(session, inst.id, ['admin']))) {
    if (cursos.length > 0) {
      const { data: materias } = await supabase
        .from('materias')
        .select('curso_id, materia_docentes(persona_id)')
        .in('curso_id', cursos.map(c => c.id))
        .is('deleted_at', null)

      const myPersonaId = session.persona_id
      const cursosConMisMateria = new Set(
        (materias ?? [])
          .filter(m => (m.materia_docentes as { persona_id: string }[]).some(d => d.persona_id === myPersonaId))
          .map(m => m.curso_id)
      )
      if (!hasAnyRole(session, inst.id, ['admin'])) {
        visibleCursos = cursos.filter(c => cursosConMisMateria.has(c.id))
      }
    }
  }

  // Redirect if only one course
  if (visibleCursos.length === 1) {
    redirect(`/dashboard/${slug}/contenidos/${visibleCursos[0].id}`)
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
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
        <div className="grid gap-3 sm:grid-cols-2">
          {visibleCursos.map(curso => (
            <Link key={curso.id} href={`/dashboard/${slug}/contenidos/${curso.id}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="text-base">{curso.nombre}</CardTitle>
                  {curso.nivel && (
                    <CardDescription>{curso.nivel}</CardDescription>
                  )}
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
