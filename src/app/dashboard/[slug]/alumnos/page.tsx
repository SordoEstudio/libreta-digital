import { requireSession, isSuperadmin, hasRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { GraduationCap } from 'lucide-react'
import NuevoAlumnoSheet from './nuevo-alumno-sheet'
import AlumnoAcciones from './alumno-acciones'
import { ResponsablesChips } from './responsables-chips'

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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Alumnos</h1>
          <p className="text-sm text-muted-foreground">{alumnos?.length ?? 0} registrados</p>
        </div>
        <NuevoAlumnoSheet instId={inst.id} cursos={cursosDisponibles ?? []} />
      </div>

      {alumnos && alumnos.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Curso</TableHead>
                <TableHead>Responsables</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-24">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alumnos.map(alumno => {
                const inscripcion = ((alumno.alumno_inscripciones ?? []) as Inscripcion[])
                  .find(i => i.activo && !i.deleted_at)
                const cursoNombre = inscripcion?.cursos?.nombre
                const responsables = responsablesMap.get(alumno.id) ?? []
                return (
                  <TableRow key={alumno.id}>
                    <TableCell className="font-medium">{alumno.nombre}</TableCell>
                    <TableCell>
                      {cursoNombre ?? (
                        <span className="text-muted-foreground text-xs">Sin curso</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <ResponsablesChips responsables={responsables} />
                    </TableCell>
                    <TableCell>
                      <Badge variant={alumno.activo ? 'default' : 'secondary'}>
                        {alumno.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <AlumnoAcciones
                        alumnoId={alumno.id}
                        alumnoNombre={alumno.nombre}
                        activo={alumno.activo}
                        instId={inst.id}
                        slug={slug}
                        cursos={cursosDisponibles ?? []}
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <GraduationCap className="size-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">Sin alumnos registrados.</p>
        </div>
      )}
    </div>
  )
}
