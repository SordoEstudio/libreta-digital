import { requireSession, isSuperadmin, hasAnyRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import Link from 'next/link'
import { BookOpen, ClipboardList } from 'lucide-react'
import NuevaEvaluacionSheet from './nueva-evaluacion-sheet'

type Params = { params: Promise<{ slug: string; materia_id: string }> }

const TIPO_LABELS: Record<string, string> = {
  parcial: 'Parcial',
  final: 'Final',
  recuperatorio: 'Recuperatorio',
  tp: 'Trabajo práctico',
  concepto: 'Concepto',
}

export default async function EvaluacionesPage({ params }: Params) {
  const { slug, materia_id } = await params
  const session = await requireSession()

  const supabase = await createClient()
  const { data: inst } = await supabase
    .from('instituciones')
    .select('id')
    .eq('slug', slug)
    .is('deleted_at', null)
    .single()

  if (!inst) notFound()
  if (!isSuperadmin(session) && !hasAnyRole(session, inst.id, ['admin', 'docente']))
    redirect(`/dashboard/${slug}`)

  const { data: materia } = await supabase
    .from('materias')
    .select('id, materias_catalogo(nombre), cursos(nombre)')
    .eq('id', materia_id)
    .eq('institucion_id', inst.id)
    .is('deleted_at', null)
    .single()

  if (!materia) notFound()

  const materiaNombre = (materia.materias_catalogo as { nombre: string } | null)?.nombre ?? ''
  const cursoNombre = (materia.cursos as { nombre: string } | null)?.nombre ?? ''

  const { data: evaluaciones } = await supabase
    .from('evaluaciones')
    .select('id, nombre, tipo, peso, orden, periodo_id, periodos(nombre)')
    .eq('materia_id', materia_id)
    .is('deleted_at', null)
    .order('orden')

  const { data: periodos } = await supabase
    .from('periodos')
    .select('id, nombre')
    .eq('institucion_id', inst.id)
    .is('deleted_at', null)
    .order('orden')

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link href={`/dashboard/${slug}/cursos`} className="hover:text-foreground">Cursos</Link>
            <span>/</span>
            <span className="hover:text-foreground cursor-pointer">{cursoNombre}</span>
            <span>/</span>
            <span>{materiaNombre}</span>
          </div>
          <h1 className="text-2xl font-semibold">{materiaNombre}</h1>
          <p className="text-sm text-muted-foreground">{evaluaciones?.length ?? 0} evaluaciones</p>
        </div>
        <NuevaEvaluacionSheet materiaId={materia_id} periodos={periodos ?? []} />
      </div>

      {evaluaciones && evaluaciones.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Período</TableHead>
                <TableHead className="w-24">Notas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {evaluaciones.map(ev => {
                const periodo = ev.periodos as { nombre: string } | null
                return (
                  <TableRow key={ev.id}>
                    <TableCell className="font-medium">{ev.nombre}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{TIPO_LABELS[ev.tipo] ?? ev.tipo}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {periodo?.nombre ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        render={<Link href={`/dashboard/${slug}/notas/${ev.id}`} />}
                      >
                        <ClipboardList data-icon="inline-start" />
                        Cargar
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <BookOpen className="size-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">Sin evaluaciones. Creá la primera.</p>
        </div>
      )}
    </div>
  )
}
