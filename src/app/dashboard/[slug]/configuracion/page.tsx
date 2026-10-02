import { requireSession, isSuperadmin, hasRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { BookOpen, Settings } from 'lucide-react'
import AñoSelector from './año-selector'
import NuevoAñoSheet from './periodos/nuevo-año-sheet'
import NuevoCursoSheet from '../cursos/nuevo-curso-sheet'
import NuevaMateriaSheet from '../cursos/[curso_id]/nueva-materia-sheet'
import AsignarDocenteSheet from './asignar-docente-sheet'
import EditarCursoSheet from './editar-curso-sheet'
import EliminarCursoButton from './eliminar-curso-button'
import EliminarMateriaButton from './eliminar-materia-button'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ año?: string; curso?: string }>
}

export default async function ConfiguracionPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { año: añoParam, curso: cursoParam } = await searchParams
  const session = await requireSession()

  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: inst } = await supabase
    .from('instituciones')
    .select('id, nombre')
    .eq('slug', slug)
    .is('deleted_at', null)
    .single()

  if (!inst) notFound()
  if (!isSuperadmin(session) && !hasRole(session, inst.id, 'admin')) redirect(`/dashboard/${slug}`)

  const { data: años } = await supabase
    .from('años_lectivos')
    .select('id, nombre, activo, periodos(id, nombre, orden)')
    .eq('institucion_id', inst.id)
    .is('deleted_at', null)
    .order('nombre', { ascending: false })

  const añosList = años ?? []
  const selectedAño = añosList.find(a => a.id === añoParam)
    ?? añosList.find(a => a.activo)
    ?? añosList[0]
    ?? null

  const { data: cursos } = selectedAño
    ? await supabase
        .from('cursos')
        .select('id, nombre, nivel, turno')
        .eq('año_lectivo_id', selectedAño.id)
        .is('deleted_at', null)
        .order('nombre')
    : { data: null }

  const selectedCurso = (cursos ?? []).find(c => c.id === cursoParam) ?? null

  // Admin client: personas RLS is own-only, join would return null rows with user client
  const { data: materias } = selectedCurso
    ? await admin
        .from('materias')
        .select('id, catalogo_id, materias_catalogo(id, nombre), materia_docentes(personas(id, nombre))')
        .eq('curso_id', selectedCurso.id)
        .is('deleted_at', null)
        .order('materias_catalogo(nombre)')
    : { data: null }

  type Periodo = { id: string; nombre: string; orden: number }
  const periodos = selectedAño
    ? [...(selectedAño.periodos as Periodo[])].sort((a, b) => a.orden - b.orden)
    : []

  return (
    <div className="flex flex-col gap-6">
      {/* Header row */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Configuración</h1>
          <NuevoAñoSheet instId={inst.id} />
        </div>

        {añosList.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap">
            <AñoSelector años={añosList} selectedId={selectedAño?.id} slug={slug} />
            {selectedAño?.activo
              ? <Badge>Activo</Badge>
              : selectedAño && <Badge variant="secondary">Inactivo</Badge>
            }
          </div>
        )}

        {periodos.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Períodos:</span>
            {periodos.map(p => (
              <Badge key={p.id} variant="secondary">{p.nombre}</Badge>
            ))}
            <Link
              href={`/dashboard/${slug}/configuracion/periodos`}
              className="inline-flex size-6 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="Gestionar períodos"
            >
              <Settings className="size-3.5" />
              <span className="sr-only">Gestionar períodos</span>
            </Link>
          </div>
        )}
      </div>

      {/* Empty: no years */}
      {!selectedAño && (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <BookOpen className="size-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">Creá el primer año lectivo para empezar.</p>
        </div>
      )}

      {/* Master-detail */}
      {selectedAño && (
        <div className="flex border rounded-lg overflow-hidden min-h-[480px]">
          {/* Left: cursos */}
          <div className="w-64 shrink-0 border-r flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30 gap-2">
              <span className="text-sm font-medium shrink-0">Cursos</span>
              <NuevoCursoSheet instId={inst.id} añoLectivoId={selectedAño.id} />
            </div>
            <nav className="flex-1 overflow-y-auto">
              {(!cursos || cursos.length === 0) ? (
                <p className="text-sm text-muted-foreground text-center py-10 px-4">
                  Sin cursos aún.
                </p>
              ) : (
                <ul className="py-1">
                  {cursos.map(c => (
                    <li key={c.id}>
                      <div className={`group flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                        selectedCurso?.id === c.id ? 'bg-accent font-medium' : 'hover:bg-accent'
                      }`}>
                        <Link
                          href={`/dashboard/${slug}/configuracion?año=${selectedAño.id}&curso=${c.id}`}
                          className="flex-1 flex items-center gap-2 min-w-0"
                        >
                          <span className="truncate">{c.nombre}</span>
                          {c.turno && (
                            <span className="text-xs text-muted-foreground capitalize shrink-0">{c.turno}</span>
                          )}
                        </Link>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <EditarCursoSheet
                            cursoId={c.id}
                            initialNombre={c.nombre}
                            initialNivel={c.nivel ?? null}
                            initialTurno={c.turno ?? null}
                          />
                          <EliminarCursoButton
                            cursoId={c.id}
                            cursoNombre={c.nombre}
                            slug={slug}
                            añoId={selectedAño.id}
                          />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </nav>
          </div>

          {/* Right: materias */}
          <div className="flex-1 flex flex-col min-w-0">
            {!selectedCurso ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  Seleccioná un curso para ver sus materias.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between px-6 py-3 border-b bg-muted/30 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium truncate">{selectedCurso.nombre}</span>
                    {selectedCurso.nivel && (
                      <span className="text-sm text-muted-foreground shrink-0">{selectedCurso.nivel}</span>
                    )}
                  </div>
                  <NuevaMateriaSheet cursoId={selectedCurso.id} instId={inst.id} />
                </div>

                {(!materias || materias.length === 0) ? (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">Sin materias. Creá la primera.</p>
                  </div>
                ) : (
                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Materia</TableHead>
                          <TableHead>Docente</TableHead>
                          <TableHead className="w-12" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {materias.map(m => {
                          type MateriaDocente = { personas: { id: string; nombre: string } | null }
                          const docente = ((m.materia_docentes ?? []) as MateriaDocente[])[0]?.personas
                          const catalogo = m.materias_catalogo as { id: string; nombre: string } | null
                          const materiaNombre = catalogo?.nombre ?? ''
                          return (
                            <TableRow key={m.id}>
                              <TableCell className="font-medium">{materiaNombre}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {docente?.nombre ?? <span className="italic">Sin docente</span>}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-0.5">
                                  <AsignarDocenteSheet
                                    materiaId={m.id}
                                    materiaNombre={materiaNombre}
                                    docenteActualId={docente?.id}
                                    instId={inst.id}
                                  />
                                  <EliminarMateriaButton
                                    materiaId={m.id}
                                    materiaNombre={materiaNombre}
                                  />
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
