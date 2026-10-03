import { requireSession, isSuperadmin, hasRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { GraduationCap, BookOpen } from 'lucide-react'
import Link from 'next/link'

type Params = { params: Promise<{ slug: string }> }

export default async function MisAlumnosPage({ params }: Params) {
  const { slug } = await params
  const session = await requireSession()

  const supabase = await createClient()
  const { data: inst } = await supabase
    .from('instituciones')
    .select('id, nombre')
    .eq('slug', slug)
    .is('deleted_at', null)
    .single()

  if (!inst) {
    if (isSuperadmin(session)) redirect('/dashboard/instituciones')
    notFound()
  }
  if (!isSuperadmin(session) && !hasRole(session, inst.id, 'responsable')) redirect(`/dashboard/${slug}`)

  if (!session.persona_id) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold">Mis alumnos</h1>
        <p className="text-muted-foreground">No se pudo identificar tu perfil. Contactá al administrador.</p>
      </div>
    )
  }

  const { data: vinculaciones } = await supabase
    .from('alumno_responsables')
    .select('alumnos(id, nombre, activo)')
    .eq('persona_id', session.persona_id)
    .eq('institucion_id', inst.id)

  type AlumnoBase = { id: string; nombre: string; activo: boolean }
  const alumnos = (vinculaciones ?? [])
    .map(v => v.alumnos as AlumnoBase | null)
    .filter((a): a is AlumnoBase => a !== null)

  // Get current course for each alumno via inscripciones
  const alumnoIds = alumnos.map(a => a.id)
  const { data: inscripciones } = alumnoIds.length > 0
    ? await supabase
        .from('alumno_inscripciones')
        .select('alumno_id, cursos(nombre)')
        .in('alumno_id', alumnoIds)
        .eq('activo', true)
        .is('deleted_at', null)
    : { data: null }

  const cursoMap = new Map(
    (inscripciones ?? []).map(i => [
      i.alumno_id,
      (i.cursos as { nombre: string } | null)?.nombre ?? null,
    ])
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Mis alumnos</h1>
        <p className="text-sm text-muted-foreground">{alumnos.length} alumno{alumnos.length !== 1 ? 's' : ''} vinculado{alumnos.length !== 1 ? 's' : ''}</p>
      </div>

      {alumnos.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="Sin alumnos vinculados."
          description="Contactá al administrador para que asigne tu cuenta a los alumnos correspondientes."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {alumnos.map(alumno => {
            const cursoNombre = cursoMap.get(alumno.id)
            return (
              <Card key={alumno.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{alumno.nombre}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    {cursoNombre && (
                      <Badge variant="outline">{cursoNombre}</Badge>
                    )}
                    <Badge variant={alumno.activo ? 'default' : 'outline'}>
                      {alumno.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    render={<Link href={`/dashboard/${slug}/libreta/${alumno.id}`} />}
                  >
                    <BookOpen data-icon="inline-start" />
                    Ver libreta
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
