import { requireSession, isSuperadmin, hasAnyRole, hasRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { BookOpen, Users } from 'lucide-react'
import NuevaMateriaSheet from './nueva-materia-sheet'

type Params = { params: Promise<{ slug: string; curso_id: string }> }

export default async function CursoDetallePage({ params }: Params) {
  const { slug, curso_id } = await params
  const session = await requireSession()

  const supabase = await createClient()
  const { data: inst } = await supabase
    .from('instituciones')
    .select('id')
    .eq('slug', slug)
    .single()

  if (!inst) notFound()
  if (!isSuperadmin(session) && !hasAnyRole(session, inst.id, ['admin', 'docente', 'responsable']))
    redirect('/dashboard')

  const { data: curso } = await supabase
    .from('cursos')
    .select('id, nombre, nivel, turno')
    .eq('id', curso_id)
    .eq('institucion_id', inst.id)
    .single()

  if (!curso) notFound()

  const { data: materias } = await supabase
    .from('materias')
    .select('id, materias_catalogo(nombre), materia_docentes(persona_id, personas(nombre))')
    .eq('curso_id', curso_id)
    .is('deleted_at', null)
    .order('materias_catalogo(nombre)')

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <Link href={`/dashboard/${slug}/cursos`} className="hover:text-foreground">Cursos</Link>
          <span>/</span>
          <span>{curso.nombre}</span>
        </div>
        <h1 className="text-2xl font-semibold">{curso.nombre}</h1>
        <div className="flex items-center gap-2 mt-1">
          {curso.nivel && <Badge variant="outline">{curso.nivel}</Badge>}
          {curso.turno && <Badge variant="secondary">{curso.turno}</Badge>}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium">Materias</h2>
          {(isSuperadmin(session) || hasRole(session, inst.id, 'admin')) && (
            <NuevaMateriaSheet cursoId={curso_id} instId={inst.id} />
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {materias?.map(materia => {
            const docentes = (materia.materia_docentes ?? []) as Array<{ persona_id: string; personas: { nombre: string } | null }>
            const nombre = (materia.materias_catalogo as { nombre: string } | null)?.nombre ?? ''
            const isAdminLevel = isSuperadmin(session) || hasRole(session, inst.id, 'admin')
            const isAssigned = isAdminLevel || docentes.some(d => d.persona_id === session.persona_id)
            return (
              <Card key={materia.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{nombre}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {docentes.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="size-3" />
                      {docentes.map(d => d.personas?.nombre).filter(Boolean).join(', ')}
                    </div>
                  )}
                  {isAssigned ? (
                    <Button
                      variant="outline"
                      size="sm"
                      render={<Link href={`/dashboard/${slug}/materias/${materia.id}/evaluaciones`} />}
                    >
                      <BookOpen data-icon="inline-start" />
                      Evaluaciones
                    </Button>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No asignado</p>
                  )}
                </CardContent>
              </Card>
            )
          })}

          {(!materias || materias.length === 0) && (
            <div className="col-span-full flex flex-col items-center justify-center gap-3 py-8 text-center">
              <BookOpen className="size-12 text-muted-foreground/40" />
              <p className="text-muted-foreground">Sin materias en este curso.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
