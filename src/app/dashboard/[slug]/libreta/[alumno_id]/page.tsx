import { requireSession, isSuperadmin, hasAnyRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import Link from 'next/link'
import { BookOpen, Printer } from 'lucide-react'

type Params = { params: Promise<{ slug: string; alumno_id: string }> }

export default async function LibretaPage({ params }: Params) {
  const { slug, alumno_id } = await params
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

  const { data: alumno } = await supabase
    .from('alumnos')
    .select('id, nombre, activo, alumno_inscripciones(curso_id, activo, deleted_at, cursos(nombre))')
    .eq('id', alumno_id)
    .eq('institucion_id', inst.id)
    .single()

  if (!alumno) notFound()

  const { data: notas } = await supabase
    .from('notas')
    .select(`
      id, valor_numerico, valor_literal, observacion, dimension_id,
      materias_dimensiones(id, nombre, peso),
      evaluaciones(id, nombre, peso, tipo, periodo_id,
        periodos(nombre, orden),
        materias(id, materias_catalogo(nombre))
      )
    `)
    .eq('alumno_id', alumno_id)
    .is('deleted_at', null)

  const { data: asistencias } = await supabase
    .from('asistencia_resumen')
    .select('materia_id, total_clases, inasistencias_justificadas, inasistencias_injustificadas')
    .eq('alumno_id', alumno_id)

  type AsistenciaTotales = { total_clases: number; inasistencias_justificadas: number; inasistencias_injustificadas: number }
  const asistenciaMap = new Map<string, AsistenciaTotales>()
  for (const a of (asistencias ?? [])) {
    if (!a.materia_id) continue
    const existing = asistenciaMap.get(a.materia_id)
    if (existing) {
      existing.total_clases += a.total_clases
      existing.inasistencias_justificadas += a.inasistencias_justificadas
      existing.inasistencias_injustificadas += a.inasistencias_injustificadas
    } else {
      asistenciaMap.set(a.materia_id, {
        total_clases: a.total_clases,
        inasistencias_justificadas: a.inasistencias_justificadas,
        inasistencias_injustificadas: a.inasistencias_injustificadas,
      })
    }
  }

  type Dimension = { id: string; nombre: string; peso: number | null }
  type Evaluacion = {
    id: string; nombre: string; peso: number; tipo: string; periodo_id: string | null
    periodos: { nombre: string; orden: number } | null
    materias: { id: string; materias_catalogo: { nombre: string } | null } | null
  }

  type NotaRow = NonNullable<typeof notas>[number]
  const materiaMap = new Map<string, { nombre: string; notas: NotaRow[] }>()
  for (const nota of (notas ?? [])) {
    const ev = nota.evaluaciones as Evaluacion | null
    if (!ev?.materias) continue
    if (ev.tipo === 'referencia') continue
    const matId = ev.materias.id
    const nombre = (ev.materias.materias_catalogo as { nombre: string } | null)?.nombre ?? ''
    if (!materiaMap.has(matId)) {
      materiaMap.set(matId, { nombre, notas: [] })
    }
    const entry = materiaMap.get(matId)
    if (entry) entry.notas.push(nota)
  }

  type Inscripcion = { curso_id: string; activo: boolean; deleted_at: string | null; cursos: { nombre: string } | null }
  const inscripcion = ((alumno.alumno_inscripciones ?? []) as Inscripcion[])
    .find(i => i.activo && !i.deleted_at)
  const cursoNombre = inscripcion?.cursos?.nombre

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="text-sm text-muted-foreground mb-1">
          <Link href={`/dashboard/${slug}/alumnos`} className="hover:text-foreground">Alumnos</Link>
          {' / Libreta'}
        </div>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{alumno.nombre}</h1>
            <div className="flex items-center gap-2 mt-1">
              {cursoNombre && <Badge variant="outline">{cursoNombre}</Badge>}
              <Badge variant={alumno.activo ? 'default' : 'secondary'}>
                {alumno.activo ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
          </div>
          <Button variant="outline" size="sm" render={<Link href={`/dashboard/${slug}/libreta/${alumno_id}/boletin`} />}>
            <Printer data-icon="inline-start" />
            Libreta
          </Button>
        </div>
      </div>

      {materiaMap.size === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <BookOpen className="size-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">Sin notas registradas.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {Array.from(materiaMap.entries()).map(([matId, mat]) => {
            const notasConEv = mat.notas
              .map(n => ({ ...n, _ev: n.evaluaciones as Evaluacion | null }))
              .filter(n => n._ev)
              .sort((a, b) => {
                const oa = a._ev!.periodos?.orden ?? 9999
                const ob = b._ev!.periodos?.orden ?? 9999
                return oa !== ob ? oa - ob : a._ev!.nombre.localeCompare(b._ev!.nombre)
              })

            // Group by período
            const periodoMap = new Map<string | null, { nombre: string; orden: number; notas: typeof notasConEv }>()
            for (const nota of notasConEv) {
              const pid = nota._ev!.periodo_id
              if (!periodoMap.has(pid)) {
                periodoMap.set(pid, {
                  nombre: nota._ev!.periodos?.nombre ?? 'Sin período',
                  orden: nota._ev!.periodos?.orden ?? 9999,
                  notas: [],
                })
              }
              periodoMap.get(pid)!.notas.push(nota)
            }
            const sortedPeriodos = [...periodoMap.entries()].sort((a, b) => a[1].orden - b[1].orden)

            return (
              <Card key={matId}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{mat.nombre}</CardTitle>
                </CardHeader>
                <CardContent>
                  {notasConEv.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin notas</p>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {sortedPeriodos.map(([pid, periodoData]) => {
                        const hasDims = periodoData.notas.some(n => n.materias_dimensiones)
                        return (
                          <div key={pid ?? 'anual'}>
                            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1 capitalize">
                              {periodoData.nombre}
                            </p>
                            <Table className="table-fixed">
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Evaluación</TableHead>
                                  {hasDims && <TableHead className="w-32">Dimensión</TableHead>}
                                  <TableHead className="w-28">Nota</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {periodoData.notas.map(nota => (
                                  <TableRow key={nota.id}>
                                    <TableCell className="font-medium">{nota._ev?.nombre}</TableCell>
                                    {hasDims && (
                                      <TableCell className="text-muted-foreground">
                                        {(nota.materias_dimensiones as Dimension | null)?.nombre ?? '—'}
                                      </TableCell>
                                    )}
                                    <TableCell className="font-semibold">
                                      <div className="flex flex-col gap-0.5">
                                        <span>{nota.valor_literal === 'A' ? 'Ausente' : (nota.valor_numerico ?? nota.valor_literal ?? '—')}</span>
                                        {nota.observacion && (
                                          <span className="text-xs font-normal text-muted-foreground italic">{nota.observacion}</span>
                                        )}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {(() => {
                    const a = asistenciaMap.get(matId)
                    if (!a || a.total_clases === 0) return null
                    const presentes = a.total_clases - a.inasistencias_justificadas - a.inasistencias_injustificadas
                    const pct = Math.round((presentes / a.total_clases) * 1000) / 10
                    return (
                      <p className="text-sm text-muted-foreground mt-3">
                        Inasistencias: {a.inasistencias_justificadas} just. / {a.inasistencias_injustificadas} injust. ({pct}% asistencia)
                      </p>
                    )
                  })()}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
