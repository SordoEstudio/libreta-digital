import { requireSession, isSuperadmin, hasAnyRole, hasRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import Link from 'next/link'
import { BookOpen, GraduationCap } from 'lucide-react'
import NuevaMateriaSheet from './nueva-materia-sheet'
import EditarMateriaSheet, { type HorarioSlot } from './editar-materia-sheet'
import ExportAlumnosButton from './export-alumnos-button'

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

  if (!inst) {
    if (isSuperadmin(session)) redirect('/dashboard/instituciones')
    notFound()
  }
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
    .select('id, materias_catalogo(nombre), materia_docentes(persona_id), materia_horarios(id, dia_semana, hora_inicio, hora_fin, aula, deleted_at)')
    .eq('curso_id', curso_id)
    .is('deleted_at', null)
    .order('materias_catalogo(nombre)')

  // Collect all persona_ids from materia_docentes, then query names in one shot
  type RawMateria = { id: string; materias_catalogo: unknown; materia_docentes: Array<{ persona_id: string }>; materia_horarios: unknown[] }
  const rawMaterias = (materias ?? []) as unknown as RawMateria[]
  const allPersonaIds = [...new Set(rawMaterias.flatMap(m => m.materia_docentes.map(d => d.persona_id)))]

  const personaMap = new Map<string, string>()
  if (allPersonaIds.length > 0) {
    const { data: docentePersonas } = await supabase
      .from('personas')
      .select('id, nombre')
      .in('id', allPersonaIds)
    for (const p of docentePersonas ?? []) personaMap.set(p.id, p.nombre)
  }

  const { data: inscripciones } = await supabase
    .from('alumno_inscripciones')
    .select('alumnos(id, nombre, activo)')
    .eq('curso_id', curso_id)
    .eq('activo', true)
    .is('deleted_at', null)

  const isAdminLevel = isSuperadmin(session) || hasRole(session, inst.id, 'admin')

  type MateriaRow = {
    id: string
    materias_catalogo: { nombre: string } | null
    materia_docentes: Array<{ persona_id: string }>
    materia_horarios: Array<{ id: string; dia_semana: number; hora_inicio: string; hora_fin: string; aula: string | null; deleted_at: string | null }>
  }

  type AlumnoInscripto = { id: string; nombre: string; activo: boolean }
  const alumnos = ((inscripciones ?? []) as unknown as Array<{ alumnos: AlumnoInscripto | null }>)
    .map(i => i.alumnos)
    .filter((a): a is AlumnoInscripto => a !== null)
    .sort((a, b) => a.nombre.localeCompare(b.nombre))

  const allMaterias = rawMaterias as unknown as MateriaRow[]
  const visibleMaterias = isAdminLevel
    ? allMaterias
    : allMaterias.filter(m => m.materia_docentes.some(md => md.persona_id === session.persona_id))

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
          {isAdminLevel && (
            <NuevaMateriaSheet cursoId={curso_id} instId={inst.id} />
          )}
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {visibleMaterias.map(materia => {
            const nombre = materia.materias_catalogo?.nombre ?? ''
            const horarios = (materia.materia_horarios ?? []).filter(h => !h.deleted_at)
            const docenteNames = materia.materia_docentes
              .map(d => personaMap.get(d.persona_id))
              .filter(Boolean) as string[]
            const docenteActual = materia.materia_docentes[0]
              ? { persona_id: materia.materia_docentes[0].persona_id, nombre: personaMap.get(materia.materia_docentes[0].persona_id) ?? '' }
              : null
            return (
              <Card key={materia.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-snug">{nombre}</CardTitle>
                    {isAdminLevel && (
                      <EditarMateriaSheet
                        materiaId={materia.id}
                        materiaNombre={nombre}
                        docenteActual={docenteActual}
                        horariosActuales={horarios as HorarioSlot[]}
                        instId={inst.id}
                      />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-2 flex-1">
                  {docenteNames.length > 0 ? (
                    <p className="text-xs text-muted-foreground">{docenteNames.join(', ')}</p>
                  ) : isAdminLevel ? (
                    <Badge variant="warning" className="w-fit text-xs">Sin docente</Badge>
                  ) : null}
                  {horarios.length > 0 && (
                    <div className="flex flex-col gap-0.5">
                      {horarios.map(h => (
                        <span key={h.id} className="text-xs text-muted-foreground">
                          {['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'][h.dia_semana]} {h.hora_inicio.slice(0, 5)}–{h.hora_fin.slice(0, 5)}{h.aula ? ` · ${h.aula}` : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="mt-auto">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    render={<Link href={`/dashboard/${slug}/materias/${materia.id}/evaluaciones`} />}
                  >
                    <BookOpen data-icon="inline-start" />
                    Evaluaciones
                  </Button>
                </CardFooter>
              </Card>
            )
          })}

          {visibleMaterias.length === 0 && (
            <div className="col-span-full">
              <EmptyState
                icon={BookOpen}
                title={isAdminLevel ? 'Sin materias en este curso.' : 'Sin materias asignadas en este curso.'}
              />
            </div>
          )}
        </div>
      </div>

      {isAdminLevel && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-medium">Alumnos inscriptos</h2>
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground">{alumnos.length} alumno{alumnos.length !== 1 ? 's' : ''}</p>
              {alumnos.length > 0 && <ExportAlumnosButton alumnos={alumnos} cursoNombre={curso.nombre} />}
            </div>
          </div>
          {alumnos.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title="Sin alumnos inscriptos en este curso."
              action={
                <Button variant="secondary" size="sm" render={<Link href={`/dashboard/${slug}/alumnos`} />}>
                  Gestionar alumnos
                </Button>
              }
            />
          ) : (
            <div className="rounded-md border max-h-[480px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-28" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alumnos.map(a => (
                    <TableRow key={a.id} className={!a.activo ? 'opacity-60' : ''}>
                      <TableCell className="font-medium">{a.nombre}</TableCell>
                      <TableCell>
                        <Badge variant={a.activo ? 'default' : 'outline'}>
                          {a.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="secondary"
                          size="sm"
                          render={<Link href={`/dashboard/${slug}/libreta/${a.id}`} />}
                        >
                          Ver libreta
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
