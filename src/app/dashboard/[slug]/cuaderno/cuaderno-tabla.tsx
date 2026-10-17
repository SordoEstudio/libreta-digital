'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Save, Loader2 } from 'lucide-react'
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

interface Props {
  alumnos: Alumno[]
  evalRefs: EvalRefCol[]
  notaDefinitivaEvalId: string | null
  notaDefinitivaMap: Record<string, string>
  materiaId: string
  periodoId: string
  periodoNombre: string
  periodos: Periodo[]
  todasDimensiones: Dimension[]
  todasUnidades: Unidad[]
}

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
  notaDefinitivaEvalId: initialDefinitivaId,
  notaDefinitivaMap: initialDefinitivaMap,
  materiaId,
  periodoId,
  periodoNombre,
  periodos,
  todasDimensiones,
  todasUnidades,
}: Props) {
  const router = useRouter()
  const [showProceso, setShowProceso] = useState(true)
  const [showDefinitiva, setShowDefinitiva] = useState(true)

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

  // Definitiva state
  const [definitivaEvalId, setDefinitivaEvalId] = useState<string | null>(initialDefinitivaId)
  const [definitivaValores, setDefinitivaValores] = useState<Record<string, string>>(initialDefinitivaMap)
  const [savingDefinitiva, setSavingDefinitiva] = useState(false)

  const sorted = useMemo(() =>
    [...alumnos].sort((a, b) => {
      const ak = `${a.apellido ?? ''}\x00${a.nombre}`.toLowerCase()
      const bk = `${b.apellido ?? ''}\x00${b.nombre}`.toLowerCase()
      return ak.localeCompare(bk, 'es')
    }), [alumnos])

  async function handleSaveDefinitiva() {
    setSavingDefinitiva(true)
    let evalId = definitivaEvalId

    // Create definitiva evaluación if it doesn't exist
    if (!evalId) {
      const res = await fetch(`/api/v1/materias/${materiaId}/evaluaciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: `Nota del período — ${periodoNombre}`,
          tipo: 'concepto',
          periodo_id: periodoId,
          es_definitiva_periodo: true,
          peso: 1,
          orden: 999,
        }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        toast.error(json.error?.message ?? 'Error al crear evaluación definitiva')
        setSavingDefinitiva(false)
        return
      }
      const json = await res.json()
      evalId = json.data.id
      setDefinitivaEvalId(evalId)
    }

    const notas = alumnos.map(a => {
      const val = definitivaValores[a.id]?.trim() ?? ''
      const num = parseFloat(val)
      return {
        alumno_id: a.id,
        valor_numerico: Number.isFinite(num) ? num : null,
        valor_literal: !Number.isFinite(parseFloat(val)) && val ? val : null,
      }
    }).filter(n => n.valor_numerico !== null || n.valor_literal !== null)

    if (notas.length === 0) {
      toast.info('Sin notas para guardar')
      setSavingDefinitiva(false)
      return
    }

    const res = await fetch('/api/v1/notas/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evaluacion_id: evalId, notas }),
    })
    const json = await res.json()
    setSavingDefinitiva(false)
    if (!res.ok) {
      toast.error(json.error?.message ?? 'Error al guardar notas')
      return
    }
    toast.success(`Notas definitivas guardadas`)
    router.refresh()
  }

  async function handleSaveProceso() {
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
    if (errorCount > 0) toast.error(`${errorCount} evaluación(es) no se pudieron guardar`)
    else toast.success(`Seguimiento guardado`)
    router.refresh()
  }

  if (alumnos.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Sin alumnos inscriptos en este curso.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toggle chips */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground mr-1">Mostrar:</span>
        {evalRefs.length > 0 && (
          <button
            onClick={() => setShowProceso(v => !v)}
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              showProceso ? 'bg-primary text-primary-foreground border-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Proceso ({evalRefs.length})
          </button>
        )}
        <button
          onClick={() => setShowDefinitiva(v => !v)}
          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            showDefinitiva ? 'bg-primary text-primary-foreground border-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Nota definitiva
        </button>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b bg-muted/30">
              {/* Alumno header */}
              <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground min-w-44 sticky left-0 bg-muted/30">
                Alumno
              </th>

              {/* Proceso headers */}
              {showProceso && evalRefs.map(ev => {
                const cols = ev.dimensiones.length > 0 ? ev.dimensiones : [null]
                return cols.map((dim, dimIdx) => (
                  <th
                    key={`${ev.id}::${dim?.id ?? '__'}`}
                    className="text-center px-2 py-2 font-medium text-xs text-muted-foreground min-w-24"
                  >
                    {dimIdx === 0 ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <div className="flex items-center gap-0.5">
                          <span className="truncate max-w-20">{ev.nombre}</span>
                          <CuadernoAccionesCol
                            evalRef={{ id: ev.id, nombre: ev.nombre, tipo: ev.tipo, periodoId: ev.periodoId, dimensionIds: ev.dimensionIds, unidadIds: ev.unidadIds }}
                            periodos={periodos}
                            dimensiones={todasDimensiones}
                            unidades={todasUnidades}
                          />
                        </div>
                        {dim && <div className="text-[10px] font-normal opacity-70">{dim.nombre}</div>}
                      </div>
                    ) : (
                      <>
                        <div className="truncate max-w-24">{ev.nombre}</div>
                        {dim && <div className="text-[10px] font-normal opacity-70">{dim.nombre}</div>}
                      </>
                    )}
                  </th>
                ))
              })}

              {/* Promedio header */}
              {showProceso && evalRefs.some(ev => ev.tipo === 'numerica') && (
                <th className="text-center px-2 py-2 font-medium text-xs text-muted-foreground min-w-20 border-l">
                  Prom.
                </th>
              )}

              {/* Definitiva header */}
              {showDefinitiva && (
                <th className="text-center px-3 py-2 font-medium text-xs min-w-32 border-l bg-amber-50/50 dark:bg-amber-950/20">
                  Nota definitiva
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {sorted.map((alumno, idx) => {
              const promedio = showProceso ? calcPromedio(alumno.id, evalRefs) : null
              return (
                <tr key={alumno.id} className={idx % 2 === 0 ? '' : 'bg-muted/10'}>
                  <td className="px-3 py-1.5 font-medium sticky left-0 bg-inherit border-r">
                    {displayNombre(alumno)}
                  </td>

                  {/* Proceso cells */}
                  {showProceso && evalRefs.map(ev => {
                    const cols = ev.dimensiones.length > 0 ? ev.dimensiones : [null as null]
                    return cols.map(dim => {
                      return (
                        <td key={`${ev.id}::${dim?.id ?? '__'}`} className="px-2 py-1 text-center">
                          <Input
                            value={valoresProceso[procesoKey(ev.id, alumno.id, dim?.id ?? null)] ?? ''}
                            onChange={e => setValoresProceso(prev => ({
                              ...prev,
                              [procesoKey(ev.id, alumno.id, dim?.id ?? null)]: e.target.value
                            }))}
                            className="h-7 w-20 text-sm text-center mx-auto"
                            placeholder="—"
                          />
                        </td>
                      )
                    })
                  })}

                  {/* Promedio */}
                  {showProceso && evalRefs.some(ev => ev.tipo === 'numerica') && (
                    <td className="px-2 py-1 text-center border-l">
                      <span className="text-sm font-semibold">
                        {promedio !== null ? promedio : '—'}
                      </span>
                    </td>
                  )}

                  {/* Definitiva cell */}
                  {showDefinitiva && (
                    <td className="px-2 py-1 text-center border-l bg-amber-50/30 dark:bg-amber-950/10">
                      <Input
                        value={definitivaValores[alumno.id] ?? ''}
                        onChange={e => setDefinitivaValores(prev => ({ ...prev, [alumno.id]: e.target.value }))}
                        className="h-7 w-20 text-sm text-center mx-auto"
                        placeholder="—"
                      />
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {(showProceso || showDefinitiva) && (
        <div className="flex justify-end gap-2">
          {showProceso && evalRefs.length > 0 && (
            <Button onClick={handleSaveProceso} disabled={savingProceso} size="sm" variant="secondary">
              {savingProceso
                ? <><Loader2 data-icon="inline-start" className="animate-spin size-3.5" />Guardando...</>
                : <><Save data-icon="inline-start" className="size-3.5" />Guardar seguimiento</>
              }
            </Button>
          )}
          {showDefinitiva && (
            <Button onClick={handleSaveDefinitiva} disabled={savingDefinitiva} size="sm">
              {savingDefinitiva
                ? <><Loader2 data-icon="inline-start" className="animate-spin size-3.5" />Guardando...</>
                : <><Save data-icon="inline-start" className="size-3.5" />Guardar nota definitiva</>
              }
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
