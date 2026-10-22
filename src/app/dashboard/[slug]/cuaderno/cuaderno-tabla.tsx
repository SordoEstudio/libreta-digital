'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Save, Loader2, ExternalLink } from 'lucide-react'
import CuadernoAccionesCol from './cuaderno-acciones-col'

interface Alumno { id: string; nombre: string; apellido: string | null }
interface Dimension { id: string; nombre: string; orden: number }
interface Periodo { id: string; nombre: string; orden: number }

interface Unidad { id: string; nombre: string }

interface EvalRefCol {
  id: string
  nombre: string
  tipo: 'numerica' | 'conceptual'
  periodoId: string | null
  dimensionIds: string[]
  unidadIds: string[]
  dimensiones: Dimension[]
  notasMap: Record<string, string> // `${alumnoId}::${dimId|'__'}` → valor
}

interface EvalLibretaColTabla {
  id: string
  nombre: string
  tipo: string
  dimensionIds: string[]
  dimensiones: Dimension[]
  notasMap: Record<string, string>
  recuperatorio: {
    id: string
    nombre: string
    dimensionIds: string[]
    dimensiones: Dimension[]
    notasMap: Record<string, string>
  } | null
}

interface Props {
  alumnos: Alumno[]
  evalRefs: EvalRefCol[]
  materiaId: string
  periodoId: string
  periodoNombre: string
  periodos: Periodo[]
  todasDimensiones: Dimension[]
  todasUnidades: Unidad[]
  periodoCerrado?: boolean
  evalsLibreta?: EvalLibretaColTabla[]
  notaAprobacion?: number | null
  slug: string
}

const UNIT_COLORS = ['#f97316','#8b5cf6','#14b8a6','#f43f5e','#6366f1','#f59e0b','#10b981']

function notaKey(alumnoId: string, dimId: string | null) {
  return `${alumnoId}::${dimId ?? '__'}`
}

function procesoKey(evalRefId: string, alumnoId: string, dimId: string | null) {
  return `${evalRefId}::${alumnoId}::${dimId ?? '__'}`
}

function displayNombre(a: Alumno) {
  return a.apellido ? `${a.apellido}, ${a.nombre}` : a.nombre
}

function calcPromedio(alumnoId: string, evalRefs: EvalRefCol[]): number | null {
  const vals: number[] = []
  for (const ev of evalRefs) {
    if (ev.tipo !== 'numerica') continue
    if (ev.dimensiones.length > 0) {
      for (const d of ev.dimensiones) {
        const v = parseFloat(ev.notasMap[notaKey(alumnoId, d.id)] ?? '')
        if (Number.isFinite(v)) vals.push(v)
      }
    } else {
      const v = parseFloat(ev.notasMap[notaKey(alumnoId, null)] ?? '')
      if (Number.isFinite(v)) vals.push(v)
    }
  }
  if (vals.length === 0) return null
  return Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 100) / 100
}

export default function CuadernoTabla({
  alumnos,
  evalRefs,
  materiaId,
  periodoId,
  periodoNombre,
  periodos,
  todasDimensiones,
  todasUnidades,
  periodoCerrado,
  evalsLibreta,
  notaAprobacion,
  slug,
}: Props) {
  const router = useRouter()

  const unitColorMap = useMemo(() => {
    const m: Record<string, string> = {}
    todasUnidades.forEach((u, i) => { m[u.id] = UNIT_COLORS[i % UNIT_COLORS.length] })
    return m
  }, [todasUnidades])

  function getEvalColor(unidadIds: string[]): string | null {
    if (unidadIds.length === 0) return null
    return unitColorMap[unidadIds[0]] ?? null
  }

  const [showProceso, setShowProceso] = useState(true)
  const [showLibreta, setShowLibreta] = useState(true)
  const [showRecuperatorios, setShowRecuperatorios] = useState(true)
  const [selectedUnidad, setSelectedUnidad] = useState<string>('todas')

  const evalRefsFiltradas = useMemo(() => {
    if (selectedUnidad === 'todas') return evalRefs
    if (selectedUnidad === 'sin_unidad') return evalRefs.filter(ev => ev.unidadIds.length === 0)
    return evalRefs.filter(ev => ev.unidadIds.includes(selectedUnidad))
  }, [evalRefs, selectedUnidad])

  // Proceso state
  const [valoresProceso, setValoresProceso] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const ev of evalRefs) {
      for (const [k, v] of Object.entries(ev.notasMap)) {
        init[`${ev.id}::${k}`] = v   // key = `${evalRefId}::${alumnoId}::${dimId|'__'}`
      }
    }
    return init
  })
  const [savingProceso, setSavingProceso] = useState(false)
  const [saving, setSaving] = useState(false)

  // Libreta state — notasMap keys are `${alumnoId}::${dimId|'__'}`, procesoKey = `${evalId}::${alumnoId}::${dimId|'__'}`
  const [valoresLibreta, setValoresLibreta] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const ev of evalsLibreta ?? []) {
      for (const [k, v] of Object.entries(ev.notasMap)) init[`${ev.id}::${k}`] = v
      if (ev.recuperatorio) {
        for (const [k, v] of Object.entries(ev.recuperatorio.notasMap))
          init[`${ev.recuperatorio.id}::${k}`] = v
      }
    }
    return init
  })

  const procesoColCount = useMemo(() =>
    evalRefsFiltradas.reduce((sum, ev) => sum + (ev.dimensiones.length || 1), 0)
  , [evalRefsFiltradas])

  const sorted = useMemo(() =>
    [...alumnos].sort((a, b) => {
      const ak = `${a.apellido ?? ''}\x00${a.nombre}`.toLowerCase()
      const bk = `${b.apellido ?? ''}\x00${b.nombre}`.toLowerCase()
      return ak.localeCompare(bk, 'es')
    }), [alumnos])

  // Dims where every student approved the parent eval → R column hidden
  const allApprovedDims = useMemo(() => {
    const result = new Set<string>()
    if (notaAprobacion == null) return result
    for (const ev of evalsLibreta ?? []) {
      if (!ev.recuperatorio) continue
      const mainDims = ev.dimensiones.length > 0 ? ev.dimensiones : [null as null]
      for (const dim of mainDims) {
        const allOk = sorted.length > 0 && sorted.every(alumno => {
          const k = procesoKey(ev.id, alumno.id, dim?.id ?? null)
          const nota = parseFloat(valoresLibreta[k] ?? ev.notasMap[notaKey(alumno.id, dim?.id ?? null)] ?? '')
          return Number.isFinite(nota) && nota >= notaAprobacion!
        })
        if (allOk) result.add(`${ev.id}::${dim?.id ?? '__'}`)
      }
    }
    return result
  }, [evalsLibreta, sorted, valoresLibreta, notaAprobacion])

  const libretaColCount = useMemo(() =>
    (evalsLibreta ?? []).reduce((sum, ev) => {
      const mainCols = ev.dimensiones.length > 0 ? ev.dimensiones.length : 1
      if (!ev.recuperatorio || !showRecuperatorios) return sum + mainCols
      const mainDims = ev.dimensiones.length > 0 ? ev.dimensiones : [null as null]
      const visibleR = mainDims.filter(dim => !allApprovedDims.has(`${ev.id}::${dim?.id ?? '__'}`)).length
      return sum + mainCols + visibleR
    }, 0)
  , [evalsLibreta, showRecuperatorios, allApprovedDims])

  function shouldShowRCol(ev: EvalLibretaColTabla, dim: { id: string } | null): boolean {
    if (!showRecuperatorios || !ev.recuperatorio) return false
    return !allApprovedDims.has(`${ev.id}::${dim?.id ?? '__'}`)
  }

  async function handleSaveProceso(): Promise<{ errors: number }> {
    setSavingProceso(true)
    let errorCount = 0
    for (const ev of evalRefs) {
      const notas = alumnos.flatMap(a => {
        const cols = ev.dimensiones.length > 0 ? ev.dimensiones : [null as null]
        return cols.map(dim => {
          const val = valoresProceso[procesoKey(ev.id, a.id, dim?.id ?? null)]?.trim() ?? ''
          const num = parseFloat(val)
          return {
            alumno_id: a.id,
            dimension_id: dim?.id ?? null,
            valor_numerico: ev.tipo === 'numerica' && Number.isFinite(num) ? num : null,
            valor_literal: ev.tipo === 'conceptual' && val ? val : null,
          }
        })
      }).filter(n => n.valor_numerico !== null || n.valor_literal !== null)
      if (notas.length === 0) continue
      const res = await fetch('/api/v1/notas-referencia/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evaluacion_ref_id: ev.id, notas }),
      })
      if (!res.ok) errorCount++
    }
    setSavingProceso(false)
    return { errors: errorCount }
  }

  async function handleSaveLibreta(): Promise<{ errors: number }> {
    const evs = evalsLibreta ?? []
    if (evs.length === 0) return { errors: 0 }

    // Build list of all evals to save (primaries + recuperatorios)
    const allToSave = evs.flatMap(ev => [
      ev,
      ...(ev.recuperatorio ? [ev.recuperatorio] : []),
    ])

    let errors = 0
    await Promise.allSettled(
      allToSave.map(async ev => {
        const cols = ev.dimensiones.length > 0 ? ev.dimensiones : [null as null]
        const notas = alumnos.flatMap(a =>
          cols.map(dim => {
            const k = procesoKey(ev.id, a.id, dim?.id ?? null)
            const raw = (valoresLibreta[k] ?? '').trim()
            if (raw === '') return null
            const isAusente = raw.toLowerCase() === 'a'
            return {
              alumno_id: a.id,
              dimension_id: dim?.id ?? null,
              valor_numerico: isAusente ? null : (isNaN(parseFloat(raw)) ? null : parseFloat(raw)),
              valor_literal: isAusente ? 'A' : null,
            }
          }).filter((n): n is NonNullable<typeof n> => n !== null)
        )
        if (notas.length === 0) return

        const res = await fetch('/api/v1/notas/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ evaluacion_id: ev.id, notas }),
        })
        if (!res.ok) errors++
      })
    )
    return { errors }
  }

  async function handleSaveAll() {
    setSaving(true)
    const [libreraResult, procesoResult] = await Promise.all([
      handleSaveLibreta(),
      handleSaveProceso(),
    ])
    setSaving(false)

    const total = libreraResult.errors + procesoResult.errors
    if (total > 0) {
      toast.error(`${total} error(es) al guardar`)
    } else {
      toast.success('Notas guardadas')
    }
    router.refresh()
  }

  if (alumnos.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Sin alumnos inscriptos en este curso.</p>
  }

  return (
    <div className="flex flex-col gap-4 min-w-0">
      {/* Combined filter + toggle chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {todasUnidades.length > 0 && (
          <>
            <span className="text-xs text-muted-foreground shrink-0">Unidad:</span>
            <button
              onClick={() => setSelectedUnidad('todas')}
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors ${selectedUnidad === 'todas' ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}
            >
              Todas
            </button>
            {todasUnidades.map((u, i) => {
              const color = UNIT_COLORS[i % UNIT_COLORS.length]
              const active = selectedUnidad === u.id
              return (
                <button
                  key={u.id}
                  onClick={() => setSelectedUnidad(u.id)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors ${active ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}
                >
                  <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: active ? 'currentColor' : color }} />
                  {u.nombre}
                </button>
              )
            })}
            <button
              onClick={() => setSelectedUnidad('sin_unidad')}
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors ${selectedUnidad === 'sin_unidad' ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}
            >
              Sin unidad
            </button>
            <span className="w-px h-4 bg-border shrink-0 mx-1" />
          </>
        )}
        <span className="text-xs text-muted-foreground shrink-0">Ver:</span>
        {(evalsLibreta ?? []).length > 0 && (
          <button
            onClick={() => setShowLibreta(v => !v)}
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              showLibreta ? 'bg-sky-600 text-white border-sky-600' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Libreta ({(evalsLibreta ?? []).length})
          </button>
        )}
        {showLibreta && (evalsLibreta ?? []).some(ev => ev.recuperatorio) && (
          <button
            onClick={() => setShowRecuperatorios(v => !v)}
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              showRecuperatorios ? 'bg-sky-100 text-sky-700 border-sky-300 dark:bg-sky-950 dark:border-sky-700 dark:text-sky-300' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            +R
          </button>
        )}
        {evalRefs.length > 0 && (
          <button
            onClick={() => setShowProceso(v => !v)}
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              showProceso ? 'bg-primary text-primary-foreground border-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Referencia ({evalRefsFiltradas.length})
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm border-collapse">
          <thead>
            {/* Row 1: group labels */}
            <tr className="border-b bg-muted/20">
              <th className="min-w-44 sticky left-0 bg-muted" />
              {showLibreta && (evalsLibreta ?? []).length > 0 && (
                <th colSpan={libretaColCount} className="text-xs font-semibold text-sky-700 bg-sky-50/50 px-2 py-1 text-left border-b">
                  Libreta {periodoCerrado && <span className="ml-1 text-[10px] font-normal text-amber-600">(período cerrado)</span>}
                </th>
              )}
              {showProceso && evalRefsFiltradas.length > 0 && (
                <th colSpan={procesoColCount} className="text-xs font-semibold text-muted-foreground px-2 py-1 text-left border-b border-l">
                  Referencia
                </th>
              )}
            </tr>

            {/* Row 2: eval names (with colSpan over their dims) */}
            <tr className="border-b bg-muted/25">
              <th rowSpan={2} className="text-left px-3 py-2 font-medium text-xs text-muted-foreground min-w-44 sticky left-0 bg-muted border-r align-bottom">
                Alumno
              </th>

              {/* Libreta eval names */}
              {showLibreta && (evalsLibreta ?? []).map((ev, evIdx) => {
                const mainCols = ev.dimensiones.length > 0 ? ev.dimensiones.length : 1
                const mainDims = ev.dimensiones.length > 0 ? ev.dimensiones : [null as null]
                const visibleRecupCols = ev.recuperatorio
                  ? mainDims.filter(dim => shouldShowRCol(ev, dim)).length
                  : 0
                const totalSpan = mainCols + visibleRecupCols
                const drillUrl = `/dashboard/${slug}/notas/${ev.id}?from=cuaderno&materia_id=${materiaId}&periodo_id=${periodoId}`
                return (
                  <th key={`lib-ev::${ev.id}`}
                      colSpan={totalSpan}
                      className={`group text-center px-2 py-1.5 text-xs font-semibold text-sky-700 bg-sky-50/40 ${evIdx > 0 ? 'border-l-2 border-border/50' : ''}`}>
                    <div className="flex items-center justify-center gap-0.5">
                      <span className="truncate max-w-24">{ev.nombre}</span>
                      <Link href={drillUrl} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <ExternalLink className="size-3" />
                      </Link>
                      {visibleRecupCols > 0 && (
                        <span className="ml-1 text-[10px] font-normal text-sky-400/70 italic">+R</span>
                      )}
                    </div>
                  </th>
                )
              })}

              {/* Referencia eval names */}
              {showProceso && evalRefsFiltradas.map((ev, evIdx) => {
                const colSpan = ev.dimensiones.length > 0 ? ev.dimensiones.length : 1
                const evalColor = getEvalColor(ev.unidadIds)
                return (
                  <th key={`proc-ev::${ev.id}`}
                      colSpan={colSpan}
                      style={evalColor ? { borderTop: `3px solid ${evalColor}` } : undefined}
                      className={`group text-center px-2 py-1.5 text-xs font-semibold text-muted-foreground ${evIdx > 0 ? 'border-l-2 border-border/50' : 'border-l border-border/30'}`}>
                    <div className="flex items-center justify-center gap-0.5">
                      <span className="truncate max-w-24">{ev.nombre}</span>
                      <CuadernoAccionesCol
                        evalRef={{ id: ev.id, nombre: ev.nombre, tipo: ev.tipo, periodoId: ev.periodoId, dimensionIds: ev.dimensionIds, unidadIds: ev.unidadIds }}
                        periodos={periodos}
                        dimensiones={todasDimensiones}
                        unidades={todasUnidades}
                      />
                    </div>
                  </th>
                )
              })}

              {/* Prom + Definitiva span 2 rows */}
              {showProceso && evalRefsFiltradas.some(ev => ev.tipo === 'numerica') && (
                <th rowSpan={2} className="text-center px-2 py-2 font-medium text-xs text-muted-foreground min-w-20 border-l align-middle">
                  Prom.
                </th>
              )}
            </tr>

            {/* Row 3: dimension names */}
            <tr className="border-b bg-muted/10">
              {/* Alumno spanned from Row 2 */}

              {/* Libreta dim names — interleaved dim | R | dim | R */}
              {showLibreta && (evalsLibreta ?? []).map((ev, evIdx) => {
                const cols = ev.dimensiones.length > 0 ? ev.dimensiones : [null as null]
                const rCols = ev.recuperatorio
                  ? (ev.recuperatorio.dimensiones.length > 0 ? ev.recuperatorio.dimensiones : [null as null])
                  : null
                return cols.flatMap((dim, dimIdx) => {
                  const dimCell = (
                    <th key={`lib-dim::${ev.id}::${dim?.id ?? '__'}`}
                        className={`text-center px-2 py-1 text-[10px] font-normal text-sky-600/80 bg-sky-50/20 ${dimIdx === 0 && evIdx > 0 ? 'border-l-2 border-border/50' : ''}`}>
                      {dim?.nombre ?? ''}
                    </th>
                  )
                  if (!rCols || !shouldShowRCol(ev, dim)) return [dimCell]
                  const rDim = rCols[dimIdx]
                  const rCell = (
                    <th key={`lib-rdim::${ev.recuperatorio!.id}::${rDim?.id ?? dimIdx}`}
                        className="text-center px-1 py-1 text-[10px] font-normal text-sky-400/60 bg-sky-50/10 border-l border-border/20">
                      R
                    </th>
                  )
                  return [dimCell, rCell]
                })
              })}

              {/* Referencia dim names */}
              {showProceso && evalRefsFiltradas.map((ev, evIdx) => {
                const cols = ev.dimensiones.length > 0 ? ev.dimensiones : [null as null]
                return cols.map((dim, dimIdx) => (
                  <th key={`proc-dim::${ev.id}::${dim?.id ?? '__'}`}
                      className={`text-center px-2 py-1 text-[10px] font-normal text-muted-foreground/70 ${dimIdx === 0 && evIdx > 0 ? 'border-l-2 border-border/50' : 'border-l border-border/20'}`}>
                    {dim?.nombre ?? ''}
                  </th>
                ))
              })}
              {/* Prom + Definitiva spanned from Row 2 */}
            </tr>
          </thead>
          <tbody>
            {sorted.map((alumno, idx) => {
              const promedio = showProceso ? calcPromedio(alumno.id, evalRefsFiltradas) : null
              return (
                <tr key={alumno.id} className={idx % 2 === 0 ? '' : 'bg-muted/10'}>
                  <td className="px-3 py-1.5 font-medium sticky left-0 bg-background border-r">
                    {displayNombre(alumno)}
                  </td>

                  {/* Libreta cells — interleaved dim | R | dim | R */}
                  {showLibreta && (evalsLibreta ?? []).map((ev, evIdx) => {
                    const cols = ev.dimensiones.length > 0 ? ev.dimensiones : [null as null]
                    const rCols = ev.recuperatorio
                      ? (ev.recuperatorio.dimensiones.length > 0 ? ev.recuperatorio.dimensiones : [null as null])
                      : null
                    return cols.flatMap((dim, dimIdx) => {
                      const k = procesoKey(ev.id, alumno.id, dim?.id ?? null)
                      const rawVal = parseFloat(valoresLibreta[k] ?? ev.notasMap[notaKey(alumno.id, dim?.id ?? null)] ?? '')
                      const mainBg = notaAprobacion != null && Number.isFinite(rawVal)
                        ? rawVal >= notaAprobacion ? 'bg-green-50/50 dark:bg-green-950/20' : 'bg-red-50/40 dark:bg-red-950/20'
                        : 'bg-sky-50/20'
                      const mainCell = (
                        <td key={`lib::${k}`} className={`px-1 py-1 ${dimIdx === 0 && evIdx > 0 ? 'border-l-2 border-border/30' : ''}`}>
                          <Input
                            value={valoresLibreta[k] ?? ''}
                            onChange={e => setValoresLibreta(prev => ({ ...prev, [k]: e.target.value }))}
                            disabled={!!periodoCerrado}
                            className={`h-7 w-16 text-center text-xs p-1 ${mainBg}`}
                            placeholder="—"
                          />
                        </td>
                      )
                      if (!rCols || !shouldShowRCol(ev, dim)) return [mainCell]
                      const rDim = rCols[dimIdx]
                      const rk = procesoKey(ev.recuperatorio!.id, alumno.id, rDim?.id ?? null)
                      const parentNota = parseFloat(valoresLibreta[k] ?? ev.notasMap[notaKey(alumno.id, dim?.id ?? null)] ?? '')
                      const dimApproved = notaAprobacion != null && !isNaN(parentNota) && parentNota >= notaAprobacion
                      const recupRaw = parseFloat(valoresLibreta[rk] ?? ev.recuperatorio!.notasMap[notaKey(alumno.id, rDim?.id ?? null)] ?? '')
                      const recupBg = !dimApproved && notaAprobacion != null && Number.isFinite(recupRaw)
                        ? recupRaw >= notaAprobacion ? 'bg-green-50/40 dark:bg-green-950/20' : 'bg-red-50/30 dark:bg-red-950/20'
                        : 'bg-sky-50/10'
                      const recupCell = (
                        <td key={`lib::recup::${rk}`} className="px-1 py-1 border-l border-border/20">
                          {dimApproved ? (
                            <span className="flex h-7 w-14 items-center justify-center text-xs text-muted-foreground/40">—</span>
                          ) : (
                            <Input
                              value={valoresLibreta[rk] ?? ''}
                              onChange={e => setValoresLibreta(prev => ({ ...prev, [rk]: e.target.value }))}
                              disabled={!!periodoCerrado}
                              className={`h-7 w-14 text-center text-xs p-1 ${recupBg}`}
                              placeholder="—"
                            />
                          )}
                        </td>
                      )
                      return [mainCell, recupCell]
                    })
                  })}

                  {/* Proceso cells */}
                  {showProceso && evalRefsFiltradas.map((ev, evIdx) => {
                    const cols = ev.dimensiones.length > 0 ? ev.dimensiones : [null as null]
                    return cols.map((dim, dimIdx) => {
                      const pv = parseFloat(valoresProceso[procesoKey(ev.id, alumno.id, dim?.id ?? null)] ?? '')
                      const procBg = ev.tipo === 'numerica' && notaAprobacion != null && Number.isFinite(pv)
                        ? pv >= notaAprobacion ? 'bg-green-50/50 dark:bg-green-950/20' : 'bg-red-50/40 dark:bg-red-950/20'
                        : ''
                      return (
                        <td key={`${ev.id}::${dim?.id ?? '__'}`} className={`px-2 py-1 text-center ${dimIdx === 0 && evIdx > 0 ? 'border-l-2 border-border/30' : ''}`}>
                          <Input
                            value={valoresProceso[procesoKey(ev.id, alumno.id, dim?.id ?? null)] ?? ''}
                            onChange={e => setValoresProceso(prev => ({
                              ...prev,
                              [procesoKey(ev.id, alumno.id, dim?.id ?? null)]: e.target.value
                            }))}
                            readOnly={!!periodoCerrado}
                            className={`h-7 w-20 text-sm text-center mx-auto ${procBg}`}
                            placeholder="—"
                          />
                        </td>
                      )
                    })
                  })}

                  {/* Promedio */}
                  {showProceso && evalRefsFiltradas.some(ev => ev.tipo === 'numerica') && (
                    <td className="px-2 py-1 text-center border-l">
                      <span className="text-sm font-semibold">
                        {promedio !== null ? promedio : '—'}
                      </span>
                    </td>
                  )}

                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {(showProceso || (evalsLibreta ?? []).length > 0) && (
        <div className="flex justify-end">
          <Button onClick={handleSaveAll} disabled={saving || !!periodoCerrado} size="sm">
            {saving
              ? <><Loader2 data-icon="inline-start" className="animate-spin size-3.5" />Guardando...</>
              : <><Save data-icon="inline-start" className="size-3.5" />Guardar notas</>
            }
          </Button>
        </div>
      )}
    </div>
  )
}
