import { requireSession, isSuperadmin, hasRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { BookMarked } from 'lucide-react'
import NuevaTemplateSheet from './nueva-template-sheet'
import EditarTemplateSheet from './editar-template-sheet'

type Params = { params: Promise<{ slug: string }> }

const TIPO_LABELS: Record<string, string> = {
  parcial: 'Parcial',
  final: 'Final',
  recuperatorio: 'Recuperatorio',
  tp: 'Trabajo práctico',
  concepto: 'Concepto',
}

export default async function EvaluacionesInstitucionalesPage({ params }: Params) {
  const { slug } = await params
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
  if (!isSuperadmin(session) && !hasRole(session, inst.id, 'admin'))
    redirect(`/dashboard/${slug}`)

  // select('*') avoids ñ TS parser issue; fetch años separately for activo flag
  const { data: periodosRaw } = await supabase
    .from('periodos')
    .select('*')
    .eq('institucion_id', inst.id)
    .is('deleted_at', null)
    .order('orden')

  const { data: añosActivos } = await supabase
    .from('años_lectivos')
    .select('id')
    .eq('institucion_id', inst.id)
    .eq('activo', true)
    .is('deleted_at', null)

  const activeAñoIds = new Set((añosActivos ?? []).map(a => a.id))
  const periodos = (periodosRaw ?? []).map(p => {
    const pr = p as { id: string; nombre: string; año_lectivo_id: string }
    return { id: pr.id, nombre: pr.nombre, isActive: activeAñoIds.has(pr.año_lectivo_id) }
  })

  const { data: templates } = await supabase
    .from('evaluaciones_template')
    .select('id, nombre, tipo, peso, orden, periodo_id, fecha, periodos(nombre, orden)')
    .eq('institucion_id', inst.id)
    .is('deleted_at', null)
    .order('orden')

  // Count instances per template
  const templateIds = (templates ?? []).map(t => t.id)
  const countMap: Record<string, number> = {}
  if (templateIds.length > 0) {
    const { data: instances } = await supabase
      .from('evaluaciones')
      .select('template_id')
      .in('template_id', templateIds)
      .is('deleted_at', null)
    for (const row of instances ?? []) {
      if (row.template_id) countMap[row.template_id] = (countMap[row.template_id] ?? 0) + 1
    }
  }

  // Group by periodo
  type Template = NonNullable<typeof templates>[number]
  const periodoMap = new Map<string, { nombre: string; templates: (Template & { instancias: number })[] }>()
  for (const t of templates ?? []) {
    const p = t.periodos as { nombre: string; orden: number } | null
    const pNombre = p?.nombre ?? 'Anual'
    const mapKey = t.periodo_id ?? '__anual__'
    if (!periodoMap.has(mapKey)) periodoMap.set(mapKey, { nombre: pNombre, templates: [] })
    periodoMap.get(mapKey)!.templates.push({ ...t, instancias: countMap[t.id] ?? 0 })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Evaluaciones institucionales</h1>
          <p className="text-sm text-muted-foreground">
            Plantillas que se propagan automáticamente a todas las materias
          </p>
        </div>
        <NuevaTemplateSheet instId={inst.id} periodos={periodos ?? []} />
      </div>

      {periodoMap.size === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <BookMarked className="size-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">Sin plantillas. Creá la primera.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {Array.from(periodoMap.entries()).map(([periodoId, grupo]) => (
            <div key={periodoId}>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                {grupo.nombre}
              </h2>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="w-24">Materias</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grupo.templates.map(t => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.nombre}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{TIPO_LABELS[t.tipo] ?? t.tipo}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {t.instancias}
                        </TableCell>
                        <TableCell>
                          <EditarTemplateSheet
                            template={{
                              id: t.id,
                              nombre: t.nombre,
                              tipo: t.tipo,
                              periodo_id: t.periodo_id,
                              fecha: t.fecha ?? null,
                              peso: t.peso,
                              orden: t.orden,
                            }}
                            instancias={t.instancias}
                            periodos={periodos ?? []}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
