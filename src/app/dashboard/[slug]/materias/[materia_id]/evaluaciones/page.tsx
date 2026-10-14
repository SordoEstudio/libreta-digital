import { requireSession, isSuperadmin, hasAnyRole, hasRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import Link from 'next/link'
import { BookOpen, ClipboardList, UserCheck } from 'lucide-react'
import NuevaEvaluacionSheet from './nueva-evaluacion-sheet'
import EditarEvaluacionSheet from './editar-evaluacion-sheet'
import GenerarRecuperatorioButton from './generar-recuperatorio-button'

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
    .select('id, materias_catalogo(nombre), cursos(id, nombre)')
    .eq('id', materia_id)
    .eq('institucion_id', inst.id)
    .is('deleted_at', null)
    .single()

  if (!materia) notFound()

  const materiaNombre = (materia.materias_catalogo as { nombre: string } | null)?.nombre ?? ''
  const cursoRaw = materia.cursos as { id: string; nombre: string } | null
  const cursoNombre = cursoRaw?.nombre ?? ''
  const cursoId = cursoRaw?.id ?? ''

  const { data: evaluaciones } = await supabase
    .from('evaluaciones')
    .select('id, nombre, tipo, peso, orden, periodo_id, fecha, template_id, permite_recuperatorio, recuperatorio_de_evaluacion_id, periodos(nombre)')
    .eq('materia_id', materia_id)
    .is('deleted_at', null)
    .order('orden')

  const recuperatorioMap = new Map<string, string>(
    (evaluaciones ?? [])
      .filter(ev => ev.recuperatorio_de_evaluacion_id)
      .map(ev => [ev.recuperatorio_de_evaluacion_id!, ev.id])
  )

  const { data: periodos } = await supabase
    .from('periodos')
    .select('id, nombre')
    .eq('institucion_id', inst.id)
    .is('deleted_at', null)
    .order('orden')

  const { data: dimensiones } = await supabase
    .from('materias_dimensiones')
    .select('id, nombre')
    .eq('materia_id', materia_id)
    .order('orden')

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link href={`/dashboard/${slug}/cursos`} className="hover:text-foreground">Cursos</Link>
            <span>/</span>
            <Link href={`/dashboard/${slug}/cursos/${cursoId}`} className="hover:text-foreground">{cursoNombre}</Link>
            <span>/</span>
            <span>{materiaNombre}</span>
          </div>
          <h1 className="text-2xl font-semibold">{materiaNombre}</h1>
          <p className="text-sm text-muted-foreground">{evaluaciones?.length ?? 0} evaluaciones</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" render={<Link href={`/dashboard/${slug}/materias/${materia_id}/asistencia`} />}>
            <UserCheck data-icon="inline-start" />
            Asistencia
          </Button>
          <NuevaEvaluacionSheet materiaId={materia_id} periodos={periodos ?? []} dimensiones={dimensiones ?? []} />
        </div>
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
                <TableHead className="w-40" />
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {evaluaciones.map(ev => {
                const periodo = ev.periodos as { nombre: string } | null
                const templateId = (ev as { template_id?: string | null }).template_id ?? null
                const recuperatorioDeId = (ev as { recuperatorio_de_evaluacion_id?: string | null }).recuperatorio_de_evaluacion_id ?? null
                return (
                  <TableRow key={ev.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {ev.nombre}
                        {templateId && (
                          <Badge variant="secondary" className="text-xs">Institucional</Badge>
                        )}
                        {recuperatorioDeId && (
                          <Badge variant="outline" className="text-xs">Recuperatorio</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{TIPO_LABELS[ev.tipo] ?? ev.tipo}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {periodo?.nombre ?? 'Anual'}
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
                    <TableCell>
                      {ev.permite_recuperatorio && (
                        <GenerarRecuperatorioButton
                          evaluacionId={ev.id}
                          recuperatorioId={recuperatorioMap.get(ev.id) ?? null}
                          slug={slug}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <EditarEvaluacionSheet
                        evaluacion={{
                          id: ev.id,
                          nombre: ev.nombre,
                          tipo: ev.tipo,
                          periodo_id: ev.periodo_id,
                          fecha: (ev as { fecha?: string | null }).fecha ?? null,
                          template_id: templateId,
                          permite_recuperatorio: ev.permite_recuperatorio,
                          dimension_id: (ev as { dimension_id?: string | null }).dimension_id ?? null,
                        }}
                        periodos={periodos ?? []}
                        dimensiones={dimensiones ?? []}
                        isAdmin={isAdminLevel}
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
          <BookOpen className="size-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">Sin evaluaciones. Creá la primera.</p>
        </div>
      )}
    </div>
  )
}
