import { requireSession, isSuperadmin, hasRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

  if (!inst) notFound()
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
    .select('alumnos(id, nombre, activo, cursos(nombre))')
    .eq('persona_id', session.persona_id)
    .eq('institucion_id', inst.id)

  type AlumnoRow = { id: string; nombre: string; activo: boolean; cursos: { nombre: string } | null }

  const alumnos = (vinculaciones ?? [])
    .map(v => v.alumnos as AlumnoRow | null)
    .filter((a): a is AlumnoRow => a !== null)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Mis alumnos</h1>
        <p className="text-sm text-muted-foreground">{alumnos.length} alumno{alumnos.length !== 1 ? 's' : ''} vinculado{alumnos.length !== 1 ? 's' : ''}</p>
      </div>

      {alumnos.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <GraduationCap className="size-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">
            No tenés alumnos vinculados. Contactá al administrador para que asigne tu cuenta
            a los alumnos correspondientes.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {alumnos.map(alumno => (
            <Card key={alumno.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{alumno.nombre}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  {alumno.cursos?.nombre && (
                    <Badge variant="outline">{alumno.cursos.nombre}</Badge>
                  )}
                  <Badge variant={alumno.activo ? 'default' : 'secondary'}>
                    {alumno.activo ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link href={`/dashboard/${slug}/libreta/${alumno.id}`} />}
                >
                  <BookOpen data-icon="inline-start" />
                  Ver libreta
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
