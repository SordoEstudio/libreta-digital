import { requireSession, isSuperadmin, hasRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import NuevoAlumnoSheet from './nuevo-alumno-sheet'
import AlumnosTabla from './alumnos-tabla'

type Params = { params: Promise<{ slug: string }> }

export default async function AlumnosPage({ params }: Params) {
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
  if (!isSuperadmin(session) && !hasRole(session, inst.id, 'admin')) redirect('/dashboard')

  const { data: alumnos } = await supabase
    .from('alumnos')
    .select('id, nombre, activo, alumno_inscripciones(curso_id, activo, deleted_at, cursos(nombre))')
    .eq('institucion_id', inst.id)
    .is('deleted_at', null)
    .order('nombre')

  const alumnoIds = (alumnos ?? []).map(a => a.id)

  type RespRow = {
    persona_id: string
    nombre: string
    email: string | null
    relacion: string | null
  }
  const responsablesMap = new Map<string, RespRow[]>()

  if (alumnoIds.length > 0) {
    const admin = createAdminClient()
    const { data: allResp } = await admin
      .from('alumno_responsables')
      .select('alumno_id, persona_id, relacion, personas(nombre, email)')
      .in('alumno_id', alumnoIds)

    for (const r of (allResp ?? [])) {
      const personas = r.personas as { nombre: string; email: string | null } | null
      const entry: RespRow = {
        persona_id: r.persona_id,
        relacion: r.relacion ?? null,
        nombre: personas?.nombre ?? '',
        email: personas?.email ?? null,
      }
      const existing = responsablesMap.get(r.alumno_id) ?? []
      existing.push(entry)
      responsablesMap.set(r.alumno_id, existing)
    }
  }

  // Only offer active year's courses for new enrollments
  const { data: añoActivo } = await supabase
    .from('años_lectivos')
    .select('id')
    .eq('institucion_id', inst.id)
    .eq('activo', true)
    .is('deleted_at', null)
    .single()

  const { data: cursosDisponibles } = añoActivo
    ? await supabase
        .from('cursos')
        .select('id, nombre')
        .eq('año_lectivo_id', añoActivo.id)
        .is('deleted_at', null)
        .order('nombre')
    : { data: null }

  type Inscripcion = { curso_id: string; activo: boolean; deleted_at: string | null; cursos: { nombre: string } | null }

  const alumnosData = (alumnos ?? []).map(alumno => {
    const inscripcion = ((alumno.alumno_inscripciones ?? []) as Inscripcion[])
      .find(i => i.activo && !i.deleted_at)
    return {
      id: alumno.id,
      nombre: alumno.nombre,
      activo: alumno.activo,
      cursoId: inscripcion?.curso_id ?? null,
      cursoNombre: inscripcion?.cursos?.nombre ?? null,
      responsables: responsablesMap.get(alumno.id) ?? [],
    }
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Alumnos</h1>
          <p className="text-sm text-muted-foreground">{alumnos?.length ?? 0} registrados</p>
        </div>
        <NuevoAlumnoSheet instId={inst.id} cursos={cursosDisponibles ?? []} />
      </div>

      <AlumnosTabla
        alumnos={alumnosData}
        instId={inst.id}
        slug={slug}
        cursos={cursosDisponibles ?? []}
      />
    </div>
  )
}
