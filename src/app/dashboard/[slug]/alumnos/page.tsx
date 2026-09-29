import { requireSession, isSuperadmin, hasRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { GraduationCap } from 'lucide-react'
import NuevoAlumnoSheet from './nuevo-alumno-sheet'
import AsignarResponsableSheet from './asignar-responsable-sheet'

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
    .select('id, nombre, activo, curso_id, cursos(nombre)')
    .eq('institucion_id', inst.id)
    .is('deleted_at', null)
    .order('nombre')

  const { data: cursosDisponibles } = await supabase
    .from('cursos')
    .select('id, nombre')
    .eq('institucion_id', inst.id)
    .is('deleted_at', null)
    .order('nombre')

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
                <TableHead>Estado</TableHead>
                <TableHead className="w-24">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alumnos.map(alumno => (
                <TableRow key={alumno.id}>
                  <TableCell className="font-medium">{alumno.nombre}</TableCell>
                  <TableCell>
                    {(alumno.cursos as { nombre: string } | null)?.nombre ?? (
                      <span className="text-muted-foreground text-xs">Sin curso</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={alumno.activo ? 'default' : 'secondary'}>
                      {alumno.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        render={<Link href={`/dashboard/${slug}/libreta/${alumno.id}`} />}
                      >
                        Ver libreta
                      </Button>
                      <AsignarResponsableSheet
                        alumnoId={alumno.id}
                        alumnoNombre={alumno.nombre}
                        instId={inst.id}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
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
