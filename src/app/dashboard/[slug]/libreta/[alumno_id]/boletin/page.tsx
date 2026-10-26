import { requireSession, isSuperadmin, hasAnyRole, hasRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import PrintButton from './print-button'
import ObservacionEditor from './observacion-editor'
import FirmasSection from './firmas-section'
import { labelConceptual } from '@/lib/conceptual'
import { isPublicadoParaCurso, PeriodoCierreOverride } from '@/lib/cierre-periodo'

type Params = { params: Promise<{ slug: string; alumno_id: string }> }

export default async function BoletinPage({ params }: Params) {
  const { slug, alumno_id } = await params
  const session = await requireSession()

  const supabase = await createClient()
  const { data: inst } = await supabase
    .from('instituciones')
    .select('id, nombre, logo_rectangular_url, director_nombre, director_cargo')
    .eq('slug', slug)
    .single()

  if (!inst) {
    if (isSuperadmin(session)) redirect('/dashboard/instituciones')
    notFound()
  }
  if (!isSuperadmin(session) && !hasAnyRole(session, inst.id, ['admin', 'docente', 'responsable', 'alumno']))
    redirect('/dashboard')

  const isAlumnoOnly = !isSuperadmin(session) &&
    hasRole(session, inst.id, 'alumno') &&
    !hasAnyRole(session, inst.id, ['admin', 'docente', 'responsable'])

  // Alumno gate: can only view their own boletín
  if (isAlumnoOnly) {
    const { data: propioAlumno } = await supabase
      .from('alumnos')
      .select('id')
      .eq('id', alumno_id)
      .eq('persona_id', session.persona_id ?? '')
      .maybeSingle()
    if (!propioAlumno) redirect(`/dashboard/${slug}`)
  }

  const isResponsableOnly = !isSuperadmin(session) && !hasRole(session, inst.id, 'admin') && !hasRole(session, inst.id, 'docente') && hasRole(session, inst.id, 'responsable')
  const canEditObservaciones = isSuperadmin(session) || hasRole(session, inst.id, 'admin') || hasRole(session, inst.id, 'docente')
  const backHref = isAlumnoOnly
    ? `/dashboard/${slug}`
    : isResponsableOnly ? `/dashboard/${slug}/mis-alumnos` : `/dashboard/${slug}/alumnos`

  const { data: alumno } = await supabase
    .from('alumnos')
    .select('id, nombre, apellido, activo, alumno_inscripciones(curso_id, activo, deleted_at)')
    .eq('id', alumno_id)
    .eq('institucion_id', inst.id)
    .single()

  if (!alumno) notFound()

  const { data: notas } = await supabase
    .from('notas')
    .select(`
      id, valor_numerico, valor_literal, observacion, dimension_id,
      materias_dimensiones(id, nombre, peso, orden, tipo),
      evaluaciones(id, nombre, tipo, peso, periodo_id, template_id,
        periodos(nombre, orden, cerrado_at, publicado_at),
        materias(id, materias_catalogo(nombre)),
        evaluaciones_template(id, nombre, tipo, orden)
      )
    `)
    .eq('alumno_id', alumno_id)
    .is('deleted_at', null)

  const { data: asistencias } = await supabase
    .from('asistencia_resumen')
    .select('materia_id, total_clases, inasistencias_justificadas, inasistencias_injustificadas')
    .eq('alumno_id', alumno_id)

  type AsistenciaTotales = {
    total_clases: number
    inasistencias_justificadas: number
    inasistencias_injustificadas: number
  }
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

  // ── Types ────────────────────────────────────────────────────────────────
  type Dimension = { id: string; nombre: string; peso: number | null; orden: number; tipo: string }
  type EvalTemplate = { id: string; nombre: string; tipo: string; orden: number }
  type Evaluacion = {
    id: string; nombre: string; tipo: string; peso: number; periodo_id: string | null
    template_id: string | null
    periodos: { nombre: string; orden: number; cerrado_at: string | null; publicado_at: string | null } | null
    materias: { id: string; materias_catalogo: { nombre: string } | null } | null
    evaluaciones_template: EvalTemplate | null
  }
  type NotaRow = NonNullable<typeof notas>[number]
  type NotaWithEv = NotaRow & { _ev: Evaluacion }

  // ── Column schema (from template_id) ────────────────────────────────────
  type TemplateCol = {
    templateId: string
    nombre: string
    orden: number
    periodoId: string | null
    periodoNombre: string
    periodoOrden: number
  }

  // ── Materia data ─────────────────────────────────────────────────────────
  type MateriaData = {
    nombre: string
    // templateId → dimId|null → nota
    notasMap: Map<string, Map<string | null, NotaWithEv>>
    // definitiva_anual: dimId|null → nota
    definitivaMap: Map<string | null, NotaWithEv>
    dimensions: Map<string, Dimension>
  }

  // Fetch per-curso overrides for the alumno's active course (used by responsables)
  type InscripcionItem = { curso_id: string; activo: boolean; deleted_at: string | null }
  const activaInsc = ((alumno.alumno_inscripciones ?? []) as InscripcionItem[])
    .find(i => i.activo && !i.deleted_at)
  const cursoBoletin = activaInsc?.curso_id ?? null

  let overrideByPeriodo = new Map<string, PeriodoCierreOverride>()
  if (cursoBoletin) {
    const { data: overrides } = await supabase
      .from('periodo_cierre_cursos')
      .select('periodo_id, cerrado_at, publicado_at, abierto_at')
      .eq('curso_id', cursoBoletin)
    overrideByPeriodo = new Map(
      (overrides ?? []).map(ov => [ov.periodo_id, ov])
    )
  }

  // Curso, año, periodos and observaciones for the observaciones section
  let añoLectivoId: string | null = null
  let cursoNombre: string | undefined
  let añoNombre: string | undefined
  if (activaInsc?.curso_id) {
    const { data: cursoRow } = await supabase
      .from('cursos')
      .select('*')
      .eq('id', activaInsc.curso_id)
      .single()
    cursoNombre = cursoRow?.nombre
    añoLectivoId = cursoRow?.año_lectivo_id ?? null
    if (añoLectivoId) {
      const { data: añoRow } = await supabase
        .from('años_lectivos')
        .select('nombre')
        .eq('id', añoLectivoId)
        .single()
      añoNombre = añoRow?.nombre
    }
  }

  type PeriodoBoletin = { id: string; nombre: string; orden: number; publicado_at: string | null }
  const { data: periodosAnoData } = añoLectivoId
    ? await supabase
        .from('periodos')
        .select('id, nombre, orden, publicado_at')
        .eq('año_lectivo_id', añoLectivoId)
        .is('deleted_at', null)
        .order('orden')
    : { data: null }
  const periodosBoletin: PeriodoBoletin[] = [...(periodosAnoData ?? [])].sort((a, b) => a.orden - b.orden)

  const { data: observaciones } = await supabase
    .from('observaciones_boletin')
    .select('id, periodo_id, texto, updated_at')
    .eq('alumno_id', alumno_id)
  const obsMap = new Map((observaciones ?? []).map(o => [o.periodo_id, o]))

  // Responsables only see notes from published periods (including the annual period)
  const notasVisible = isResponsableOnly
    ? (notas ?? []).filter(n => {
        const ev = n.evaluaciones as Evaluacion | null
        if (!ev?.periodo_id || !ev?.periodos) return false
        const ov = overrideByPeriodo.get(ev.periodo_id) ?? null
        return isPublicadoParaCurso(
          (ev.periodos as { publicado_at: string | null }).publicado_at,
          ov
        )
      })
    : (notas ?? [])

  const templateColMap = new Map<string, TemplateCol>()
  const materiaDataMap = new Map<string, MateriaData>()

  for (const nota of notasVisible) {
    const ev = nota.evaluaciones as Evaluacion | null
    if (!ev?.materias) continue
    const matId = ev.materias.id
    const matNombre = (ev.materias.materias_catalogo as { nombre: string } | null)?.nombre ?? ''

    if (!materiaDataMap.has(matId)) {
      materiaDataMap.set(matId, {
        nombre: matNombre,
        notasMap: new Map(),
        definitivaMap: new Map(),
        dimensions: new Map(),
      })
    }
    const matData = materiaDataMap.get(matId)!

    if (nota.materias_dimensiones) {
      const dim = nota.materias_dimensiones as Dimension
      matData.dimensions.set(dim.id, dim)
    }

    const notaWithEv: NotaWithEv = { ...nota, _ev: ev }
    const dimId = nota.dimension_id ?? null

    if (ev.tipo === 'definitiva_anual') {
      matData.definitivaMap.set(dimId, notaWithEv)
    } else if (ev.template_id) {
      if (!templateColMap.has(ev.template_id)) {
        const tpl = ev.evaluaciones_template as EvalTemplate | null
        templateColMap.set(ev.template_id, {
          templateId: ev.template_id,
          nombre: tpl?.nombre ?? ev.nombre,
          orden: tpl?.orden ?? 0,
          periodoId: ev.periodo_id,
          periodoNombre: ev.periodos?.nombre ?? 'Sin período',
          periodoOrden: ev.periodos?.orden ?? 9999,
        })
      }
      if (!matData.notasMap.has(ev.template_id)) matData.notasMap.set(ev.template_id, new Map())
      matData.notasMap.get(ev.template_id)!.set(dimId, notaWithEv)
    }
  }

  // Sort columns: período.orden → template.orden
  const sortedCols = [...templateColMap.values()].sort((a, b) =>
    a.periodoOrden !== b.periodoOrden ? a.periodoOrden - b.periodoOrden : a.orden - b.orden
  )

  // Group columns by período for row-1 headers
  type PeriodoGroup = { id: string | null; nombre: string; orden: number; cols: TemplateCol[] }
  const periodoGroups: PeriodoGroup[] = []
  for (const col of sortedCols) {
    const existing = periodoGroups.find(g => g.id === col.periodoId)
    if (existing) {
      existing.cols.push(col)
    } else {
      periodoGroups.push({ id: col.periodoId, nombre: col.periodoNombre, orden: col.periodoOrden, cols: [col] })
    }
  }

  const hasDefinitiva = [...materiaDataMap.values()].some(m => m.definitivaMap.size > 0)
  const noData = materiaDataMap.size === 0 && sortedCols.length === 0

  function formatNota(nota: NotaWithEv | undefined): string {
    if (!nota) return '—'
    if (nota.valor_literal === 'A') return 'Ausente'
    if (nota.valor_numerico !== null) return nota.valor_numerico.toString()
    const dim = nota.materias_dimensiones as Dimension | null
    if (dim?.tipo === 'conceptual' && nota.valor_literal) return labelConceptual(nota.valor_literal)
    return nota.valor_literal ?? '—'
  }

  return (
    <div>
      {/* Toolbar — hidden on print */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Button variant="ghost" size="sm" render={<Link href={backHref} />}>
          <ArrowLeft data-icon="inline-start" />
          Volver
        </Button>
        <PrintButton alumnoNombre={alumno.apellido ? `${alumno.apellido}, ${alumno.nombre}` : alumno.nombre} />
      </div>

      <div className="max-w-5xl mx-auto print:max-w-none">
        {/* Header */}
        <div className="text-center mb-6 pb-4 border-b">
          {inst.logo_rectangular_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={inst.logo_rectangular_url} alt={inst.nombre} className="mx-auto mb-3 h-12 object-contain print:h-10" />
          )}
          <p className="text-sm text-muted-foreground print:text-gray-600">{inst.nombre}</p>
          <h1 className="text-xl font-bold mt-1 md:text-2xl">Libreta de Calificaciones</h1>
          <div className="flex justify-center gap-6 mt-3 text-sm">
            <span><strong>Alumno:</strong> {alumno.apellido ? `${alumno.apellido}, ${alumno.nombre}` : alumno.nombre}</span>
            {cursoNombre && <span><strong>Curso:</strong> {cursoNombre}</span>}
            {añoNombre && <span><strong>Año:</strong> {añoNombre}</span>}
          </div>
        </div>

        {/* Notas — tabla unificada */}
        {noData ? (
          <p className="text-center text-muted-foreground py-8">
            {isResponsableOnly ? 'Aún no hay períodos publicados.' : 'Sin notas registradas.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                {/* Fila 1: períodos */}
                <tr className="text-xs uppercase tracking-wide text-muted-foreground print:text-gray-600">
                  <th className="text-left pb-1 pr-4 font-medium border-b-2 border-border" rowSpan={2}>
                    Materia
                  </th>
                  {periodoGroups.map(pg => (
                    <th
                      key={pg.id ?? 'sin-periodo'}
                      colSpan={pg.cols.length}
                      className="text-center pb-1 px-1 font-semibold border-b border-border/50 capitalize"
                    >
                      {pg.nombre}
                    </th>
                  ))}
                  {hasDefinitiva && (
                    <th
                      className="text-center pb-1 px-2 font-semibold border-b-2 border-border"
                      rowSpan={2}
                    >
                      Definitiva
                    </th>
                  )}
                </tr>
                {/* Fila 2: nombres de template */}
                <tr className="text-xs text-muted-foreground print:text-gray-600">
                  {sortedCols.map(col => (
                    <th
                      key={col.templateId}
                      className="text-center pb-1 px-2 font-medium border-b-2 border-border capitalize whitespace-nowrap"
                    >
                      {col.nombre}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...materiaDataMap.entries()].map(([matId, matData]) => {
                  const sortedDims = [...matData.dimensions.values()].sort((a, b) => a.orden - b.orden)
                  const hasDims = sortedDims.length > 0
                  const asist = asistenciaMap.get(matId)
                  const totalInasist = asist ? (asist.inasistencias_justificadas + asist.inasistencias_injustificadas) : 0
                  const asistInfo = totalInasist > 0
                    ? `${totalInasist} inasistencia${totalInasist !== 1 ? 's' : ''}`
                    : null

                  if (hasDims) {
                    return sortedDims.map((dim, dimIdx) => (
                      <tr
                        key={dim.id}
                        className={`print:border-gray-200 ${
                          dimIdx === 0
                            ? 'border-t-2 border-border/60'
                            : 'border-t border-muted/40'
                        }`}
                      >
                        {/* Materia name cell — spans all dim rows */}
                        {dimIdx === 0 && (
                          <td
                            className="py-1.5 pr-4 font-medium align-top"
                            rowSpan={sortedDims.length}
                          >
                            {matData.nombre}
                            {asistInfo && (
                              <span className="block text-xs font-normal text-muted-foreground print:text-gray-500 mt-0.5">
                                {asistInfo}
                              </span>
                            )}
                          </td>
                        )}
                        {/* Template columns for this dimension */}
                        {sortedCols.map(col => {
                          const nota = matData.notasMap.get(col.templateId)?.get(dim.id)
                          const isAusente = nota?.valor_literal === 'A'
                          return (
                            <td key={col.templateId} className="text-center py-1.5 px-2">
                              <span className={isAusente ? 'text-orange-600 font-medium' : 'font-semibold'}>
                                {formatNota(nota)}
                              </span>
                              {nota?.observacion && (
                                <span className="block text-xs italic font-normal text-muted-foreground print:text-gray-500">
                                  {nota.observacion}
                                </span>
                              )}
                            </td>
                          )
                        })}
                        {/* Definitiva — only on first dim row */}
                        {hasDefinitiva && (
                          <td className={`text-center py-1.5 px-2 ${dimIdx === 0 ? 'font-semibold' : 'text-muted-foreground/40'}`}>
                            {dimIdx === 0
                              ? formatNota(matData.definitivaMap.get(null) ?? matData.definitivaMap.get(dim.id))
                              : ''}
                          </td>
                        )}
                      </tr>
                    ))
                  }

                  // Single row — no dimensions
                  return (
                    <tr key={matId} className="border-t-2 border-border/60 print:border-gray-300">
                      <td className="py-1.5 pr-4 font-medium">
                        {matData.nombre}
                        {asistInfo && (
                          <span className="block text-xs font-normal text-muted-foreground print:text-gray-500 mt-0.5">
                            {asistInfo}
                          </span>
                        )}
                      </td>
                      {sortedCols.map(col => {
                        const nota = matData.notasMap.get(col.templateId)?.get(null)
                        const isAusente = nota?.valor_literal === 'A'
                        return (
                          <td key={col.templateId} className="text-center py-1.5 px-2">
                            <span className={isAusente ? 'text-orange-600 font-medium' : 'font-semibold'}>
                              {formatNota(nota)}
                            </span>
                            {nota?.observacion && (
                              <span className="block text-xs italic font-normal text-muted-foreground print:text-gray-500">
                                {nota.observacion}
                              </span>
                            )}
                          </td>
                        )
                      })}
                      {hasDefinitiva && (
                        <td className="text-center py-1.5 px-2 font-semibold">
                          {formatNota(matData.definitivaMap.get(null))}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Observaciones del docente */}
        {periodosBoletin.length > 0 && (canEditObservaciones || obsMap.size > 0) && (
          <div className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3 print:text-gray-600">
              Observaciones del docente
            </h2>
            <div className="flex flex-col gap-4">
              {periodosBoletin
                .filter(p => {
                  if (canEditObservaciones) return true
                  const ov = overrideByPeriodo.get(p.id) ?? null
                  return isPublicadoParaCurso(p.publicado_at, ov) && obsMap.has(p.id)
                })
                .map(p => {
                  const obs = obsMap.get(p.id)
                  return (
                    <div key={p.id}>
                      <p className="text-xs font-medium text-muted-foreground mb-1 print:text-gray-600">{p.nombre}</p>
                      <ObservacionEditor
                        alumnoId={alumno_id}
                        periodoId={p.id}
                        periodoNombre={p.nombre}
                        initialTexto={obs?.texto ?? ''}
                        canEdit={canEditObservaciones}
                      />
                    </div>
                  )
                })
              }
            </div>
          </div>
        )}

        {/* Firmas — print only */}
        <FirmasSection
          directorNombre={inst.director_nombre ?? null}
          directorCargo={inst.director_cargo ?? null}
          instNombre={inst.nombre}
        />

        {/* Footer */}
        <div className="mt-8 pt-4 border-t text-xs text-muted-foreground print:text-gray-500 text-center print:hidden">
          Libreta Digital · {inst.nombre}
        </div>
      </div>
    </div>
  )
}
