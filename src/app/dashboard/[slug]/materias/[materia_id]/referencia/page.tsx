import { requireSession, isSuperadmin, hasAnyRole, hasRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import Link from 'next/link'
import { BookMarked, ClipboardList } from 'lucide-react'
import NuevaEvalRefSheet from '@/components/eval-ref/nueva-eval-ref-sheet'
import EvalRefAcciones from './eval-ref-acciones'

type Params = { params: Promise<{ slug: string; materia_id: string }> }

const TIPO_LABELS: Record<string, string> = {
  numerica: 'Numérica',
  conceptual: 'Conceptual',
}

export default async function ReferenciaPage({ params }: Params) {
  const { slug, materia_id } = await params
  const session = await requireSession()

  const supabase = await createClient()
  const { data: inst } = await supabase
    .from('instituciones')
    .select('id')
    .eq('slug', slug)
    .is('deleted_at', null)
    .single()

  if (!inst) {
    if (isSuperadmin(session)) redirect('/dashboard/instituciones')
    notFound()
  }
  if (!isSuperadmin(session) && !hasAnyRole(session, inst.id, ['admin', 'docente']))
    redirect(`/dashboard/${slug}`)

  const isAdminLevel = isSuperadmin(session) || hasRole(session, inst.id, 'admin')

  if (!isAdminLevel) {
    if (!session.persona_id) redirect(`/dashboard/${slug}`)
    const { data: assignment } = await supabase
      .from('materia_docentes')
      .select('persona_id')
      .eq('materia_id', materia_id)
      .eq('persona_id', session.persona_id)
      .maybeSingle()
    if (!assignment) redirect(`/dashboard/${slug}`)
  }

  const { data: materia } = await supabase
    .from('materias')
    .select('id, materias_catalogo(nombre), cursos(id, nombre), materias_dimensiones(id, nombre, orden)')
    .eq('id', materia_id)
    .eq('institucion_id', inst.id)
    .is('deleted_at', null)
    .single()

  if (!materia) notFound()

  const materiaNombre = (materia.materias_catalogo as { nombre: string } | null)?.nombre ?? ''
  const cursoRaw = materia.cursos as { id: string; nombre: string } | null
  const cursoNombre = cursoRaw?.nombre ?? ''
  const cursoId = cursoRaw?.id ?? ''

  type Dimension = { id: string; nombre: string; orden: number }
  const dimensiones = ([...(materia.materias_dimensiones as Dimension[] ?? [])]).sort((a, b) => a.orden - b.orden)

  // Periodos del año lectivo activo de este curso
  type Periodo = { id: string; nombre: string; orden: number }
  let periodos: Periodo[] = []
  if (cursoId) {
    const { data: curso } = await supabase
      .from('cursos')
      .select('*')
      .eq('id', cursoId)
      .single()
    if (curso?.año_lectivo_id) {
      const { data: periodoRows } = await supabase
        .from('periodos')
        .select('id, nombre, orden')
        .eq('año_lectivo_id', curso.año_lectivo_id)
        .order('orden')
      periodos = (periodoRows ?? []) as Periodo[]
    }
  }

  const { data: evalRefs } = await supabase
    .from('evaluaciones_referencia')
    .select('id, nombre, tipo, fecha, periodo_id, created_at, evaluacion_referencia_dimensiones(dimension_id)')
    .eq('materia_id', materia_id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  const periodoMap = new Map(periodos.map(p => [p.id, p.nombre]))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link href={`/dashboard/${slug}/cursos`} className="hover:text-foreground">Cursos</Link>
            <span>/</span>
            <Link href={`/dashboard/${slug}/cursos/${cursoId}`} className="hover:text-foreground">{cursoNombre}</Link>
            <span>/</span>
            <Link href={`/dashboard/${slug}/materias/${materia_id}/evaluaciones`} className="hover:text-foreground">{materiaNombre}</Link>
            <span>/</span>
            <span>Referencia</span>
          </div>
          <h1 className="text-2xl font-semibold">Notas de referencia</h1>
          <p className="text-sm text-muted-foreground">{evalRefs?.length ?? 0} evaluaciones internas · No se publican en la libreta</p>
        </div>
        <NuevaEvalRefSheet materiaId={materia_id} periodos={periodos} dimensiones={dimensiones} />
      </div>

      {evalRefs && evalRefs.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="w-28">Notas</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {evalRefs.map(ev => {
                type EvRefDim = { dimension_id: string }
                const dimIds = (ev.evaluacion_referencia_dimensiones as EvRefDim[] ?? []).map(d => d.dimension_id)
                return (
                  <TableRow key={ev.id}>
                    <TableCell className="font-medium">{ev.nombre}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{TIPO_LABELS[ev.tipo] ?? ev.tipo}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {ev.periodo_id ? (periodoMap.get(ev.periodo_id) ?? '—') : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {ev.fecha ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        render={<Link href={`/dashboard/${slug}/materias/${materia_id}/referencia/${ev.id}`} />}
                      >
                        <ClipboardList data-icon="inline-start" />
                        Cargar
                      </Button>
                    </TableCell>
                    <TableCell>
                      <EvalRefAcciones
                        evalRefId={ev.id}
                        evalRefNombre={ev.nombre}
                        evalRefTipo={ev.tipo as 'numerica' | 'conceptual'}
                        evalRefFecha={ev.fecha ?? null}
                        evalRefPeriodoId={ev.periodo_id ?? null}
                        evalRefDimensionIds={dimIds}
                        periodos={periodos}
                        dimensiones={dimensiones}
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
          <BookMarked className="size-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">Sin evaluaciones de referencia. Creá la primera.</p>
        </div>
      )}
    </div>
  )
}
