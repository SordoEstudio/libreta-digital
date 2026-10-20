import { requireSession, isSuperadmin, hasRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { GraduationCap } from 'lucide-react'
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
        <h1 className="text-xl font-semibold md:text-2xl">Mis alumnos</h1>
        <p className="text-muted-foreground">No se pudo identificar tu perfil. Contactá al administrador.</p>
      </div>
    )
  }

  const { data: vinculaciones } = await supabase
    .from('alumno_responsables')
    .select('alumnos(id, nombre, apellido, activo)')
    .eq('persona_id', session.persona_id)
    .eq('institucion_id', inst.id)

  type AlumnoBase = { id: string; nombre: string; apellido: string | null; activo: boolean }
  const alumnos = (vinculaciones ?? [])
    .map(v => v.alumnos as AlumnoBase | null)
    .filter((a): a is AlumnoBase => a !== null)
    .sort((a, b) => {
      const ak = a.apellido ?? a.nombre
      const bk = b.apellido ?? b.nombre
      return ak.localeCompare(bk, 'es') || a.nombre.localeCompare(b.nombre, 'es')
    })

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
        <h1 className="text-xl font-semibold md:text-2xl">Mis alumnos</h1>
        <p className="text-sm text-muted-foreground">{alumnos.length} alumno{alumnos.length !== 1 ? 's' : ''} vinculado{alumnos.length !== 1 ? 's' : ''}</p>
      </div>

      {alumnos.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="Sin alumnos vinculados."
          description="Contactá al administrador para que asigne tu cuenta a los alumnos correspondientes."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {alumnos.map(alumno => {
            const cursoNombre = cursoMap.get(alumno.id)
            return (
              <Link
                key={alumno.id}
                href={`/dashboard/${slug}/libreta/${alumno.id}`}
                className="block rounded-lg border p-4 hover:bg-muted/50 transition-colors"
              >
                <p className="font-medium">{alumno.apellido ? `${alumno.apellido}, ${alumno.nombre}` : alumno.nombre}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {cursoNombre && <Badge variant="outline">{cursoNombre}</Badge>}
                  {!alumno.activo && <Badge variant="outline">Inactivo</Badge>}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
