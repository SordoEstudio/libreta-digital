'use client'

import { useState, useMemo, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Save, Loader2, Download, ChevronsUpDown, ChevronUp, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'

interface Alumno {
  id: string
  nombre: string
  apellido: string | null
}

interface NotaExistente {
  id: string
  alumno_id: string
  dimension_id: string | null
  valor_numerico: number | null
  valor_literal: string | null
  observacion: string | null
}

interface Dimension {
  id: string
  nombre: string
}

interface NotasEditorProps {
  evaluacionId: string
  evaluacionNombre: string
  alumnos: Alumno[]
  notasExistentes: NotaExistente[]
  dimensiones: Dimension[]
  slug: string
  notaAprobacion: number | null
  permiteRecuperatorio: boolean
  recuperatorioId: string | null
  esRecuperatorio: boolean
  // For recuperatorios: Map<alumno_id, Set<dim_id | '__none__'>> of eligible (failed) cells
  // null = not a recuperatorio, show all students
  eligibles?: Map<string, Set<string>> | null
  escalaMin?: number | null
  escalaMax?: number | null
}

type SortDir = 'asc' | 'desc'

function displayNombre(a: Alumno) {
  return a.apellido ? `${a.apellido}, ${a.nombre}` : a.nombre
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown className="size-3 ml-1 opacity-40" />
  return dir === 'asc'
    ? <ChevronUp className="size-3 ml-1" />
    : <ChevronDown className="size-3 ml-1" />
}

export function NotasEditor({
  evaluacionId, evaluacionNombre, alumnos, notasExistentes, dimensiones, slug,
  notaAprobacion, permiteRecuperatorio, recuperatorioId, esRecuperatorio, eligibles,
  escalaMin, escalaMax,
}: NotasEditorProps) {
  const hasDims = dimensiones.length > 0

  // Multi-dim state: valoresDim[alumnoId][dimId] = value string
  const [valoresDim, setValoresDim] = useState<Record<string, Record<string, string>>>(() => {
    const init: Record<string, Record<string, string>> = {}
    for (const alumno of alumnos) {
      init[alumno.id] = {}
      for (const dim of dimensiones) {
        const nota = notasExistentes.find(n => n.alumno_id === alumno.id && n.dimension_id === dim.id)
        init[alumno.id][dim.id] = nota?.valor_literal === 'A'
          ? 'A'
          : (nota?.valor_numerico?.toString() ?? nota?.valor_literal ?? '')
      }
    }
    return init
  })

  // Single-dim state: valores[alumnoId] = value string
  const notaMap = new Map(notasExistentes.filter(n => !n.dimension_id).map(n => [n.alumno_id, n]))
  const [valores, setValores] = useState<Record<string, string>>(() => {
    if (hasDims) return {}
    const init: Record<string, string> = {}
    for (const alumno of alumnos) {
      const nota = notaMap.get(alumno.id)
      init[alumno.id] = nota?.valor_literal === 'A' ? 'A' : (nota?.valor_numerico?.toString() ?? nota?.valor_literal ?? '')
    }
    return init
  })

  const [observaciones, setObservaciones] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const alumno of alumnos) {
      if (hasDims) {
        const nota = notasExistentes.find(n => n.alumno_id === alumno.id && n.dimension_id === dimensiones[0]?.id)
        init[alumno.id] = nota?.observacion ?? ''
      } else {
        init[alumno.id] = notaMap.get(alumno.id)?.observacion ?? ''
      }
    }
    return init
  })

  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [isPending, startTransition] = useTransition()
  const [generando, setGenerando] = useState(false)
  const router = useRouter()

  const sortedAlumnos = useMemo(() => {
    const filtered = eligibles ? alumnos.filter(a => eligibles.has(a.id)) : alumnos
    return [...filtered].sort((a, b) => {
      const cmp = displayNombre(a).localeCompare(displayNombre(b), 'es')
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [alumnos, sortDir, eligibles])

  function handleChange(alumnoId: string, value: string) {
    setValores(prev => ({ ...prev, [alumnoId]: value }))
  }

  function handleChangeDim(alumnoId: string, dimId: string, value: string) {
    setValoresDim(prev => ({
      ...prev,
      [alumnoId]: { ...(prev[alumnoId] ?? {}), [dimId]: value },
    }))
  }

  function handleObservacion(alumnoId: string, value: string) {
    setObservaciones(prev => ({ ...prev, [alumnoId]: value }))
  }

  function handleExport() {
    if (hasDims) {
      const rows = sortedAlumnos.map(a => {
        const row: Record<string, string> = { Alumno: displayNombre(a) }
        for (const dim of dimensiones) {
          const v = valoresDim[a.id]?.[dim.id] ?? ''
          row[dim.nombre] = v.toUpperCase() === 'A' ? 'Ausente' : (v || '—')
        }
        return row
      })
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Notas')
      XLSX.writeFile(wb, `${evaluacionNombre}.xlsx`)
    } else {
      const rows = sortedAlumnos.map(a => ({
        Alumno: displayNombre(a),
        Nota: (valores[a.id] ?? '').toUpperCase() === 'A' ? 'Ausente' : (valores[a.id] || '—'),
        Observación: (valores[a.id] ?? '').toUpperCase() === 'A' ? '' : (observaciones[a.id] ?? ''),
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Notas')
      XLSX.writeFile(wb, `${evaluacionNombre}.xlsx`)
    }
  }

  async function handleSave() {
    let notas: Array<{ alumno_id: string; dimension_id?: string | null; valor_numerico: number | null; valor_literal: string | null; observacion?: string }>

    if (hasDims) {
      notas = alumnos.flatMap(a => {
        const obs = observaciones[a.id]?.trim()
        return dimensiones.map(dim => {
          const raw = (valoresDim[a.id]?.[dim.id] ?? '').trim()
          if (raw.toUpperCase() === 'A') {
            return { alumno_id: a.id, dimension_id: dim.id, valor_numerico: null as number | null, valor_literal: 'A' as string | null }
          }
          const num = raw !== '' ? parseFloat(raw) : null
          return {
            alumno_id: a.id,
            dimension_id: dim.id,
            valor_numerico: num as number | null,
            valor_literal: null as string | null,
            ...(obs ? { observacion: obs } : {}),
          }
        })
      })
    } else {
      notas = alumnos.map(a => {
        const raw = (valores[a.id] ?? '').trim()
        if (raw.toUpperCase() === 'A') {
          return { alumno_id: a.id, valor_numerico: null, valor_literal: 'A' }
        }
        const num = raw !== '' ? parseFloat(raw) : null
        const obs = observaciones[a.id]?.trim()
        return { alumno_id: a.id, valor_numerico: num, valor_literal: null, ...(obs ? { observacion: obs } : {}) }
      })
    }

    // Client-side scale validation
    if (escalaMin !== null && escalaMin !== undefined && escalaMax !== null && escalaMax !== undefined) {
      const fueraDeEscala = notas.find(n => n.valor_numerico !== null && (n.valor_numerico < escalaMin! || n.valor_numerico > escalaMax!))
      if (fueraDeEscala) {
        toast.error(`Nota ${fueraDeEscala.valor_numerico} fuera de escala (${escalaMin}–${escalaMax})`)
        return
      }
    }

    startTransition(async () => {
      const res = await fetch(`/api/v1/notas/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evaluacion_id: evaluacionId, notas }),
      })

      if (res.ok) {
        const data = await res.json()
        toast.success(`${data.data.upserted} notas guardadas`)
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err?.error?.message ?? 'Error al guardar')
      }
    })
  }

  const countBelowThreshold = notaAprobacion !== null && !hasDims
    ? alumnos.filter(a => {
        const v = valores[a.id] ?? ''
        return v.toUpperCase() === 'A' || (v !== '' && parseFloat(v) < notaAprobacion!)
      }).length
    : notaAprobacion !== null && hasDims
      ? alumnos.filter(a =>
          dimensiones.some(dim => {
            const raw = valoresDim[a.id]?.[dim.id] ?? ''
            return raw.toUpperCase() === 'A' || (raw !== '' && parseFloat(raw) < notaAprobacion!)
          })
        ).length
      : 0

  async function handleGenerar() {
    setGenerando(true)
    const res = await fetch(`/api/v1/evaluaciones/${evaluacionId}/recuperatorio`, { method: 'POST' })
    const json = await res.json()
    setGenerando(false)
    if (res.ok) {
      toast.success('Recuperatorio generado')
      router.refresh()
    } else {
      toast.error(json.error?.message ?? 'Error al generar recuperatorio')
    }
  }

  const inputMin = escalaMin !== null && escalaMin !== undefined ? escalaMin : 0
  const inputMax = escalaMax !== null && escalaMax !== undefined ? escalaMax : 10

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button
                  className="flex items-center font-medium"
                  onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                >
                  Alumno
                  <SortIcon active dir={sortDir} />
                </button>
              </TableHead>
              {hasDims ? (
                dimensiones.map(dim => (
                  <TableHead key={dim.id} className="w-36">{dim.nombre}</TableHead>
                ))
              ) : (
                <>
                  <TableHead className="w-32">Nota</TableHead>
                  <TableHead>Observación</TableHead>
                  {notaAprobacion !== null && <TableHead className="w-28">Resultado</TableHead>}
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedAlumnos.map(alumno => (
              <TableRow key={alumno.id}>
                <TableCell className="font-medium">{displayNombre(alumno)}</TableCell>
                {hasDims ? (
                  dimensiones.map(dim => {
                    const dimEligible = !eligibles || eligibles.get(alumno.id)?.has(dim.id)
                    const dimVal = valoresDim[alumno.id]?.[dim.id] ?? ''
                    const isAusenteDim = dimVal.toUpperCase() === 'A'
                    const cellVal = parseFloat(dimVal)
                    const cellBg = dimEligible && !isAusenteDim && notaAprobacion != null && Number.isFinite(cellVal)
                      ? cellVal >= notaAprobacion ? 'bg-green-50/60 dark:bg-green-950/20' : 'bg-red-50/50 dark:bg-red-950/20'
                      : ''
                    return (
                      <TableCell key={dim.id} className={cellBg}>
                        {!dimEligible ? (
                          <span className="text-xs text-muted-foreground/50">—</span>
                        ) : (
                          <Input
                            type="text"
                            placeholder="—"
                            value={dimVal}
                            onChange={e => handleChangeDim(alumno.id, dim.id, e.target.value.toUpperCase() === 'A' ? 'A' : e.target.value)}
                            className={`w-20 ${isAusenteDim ? 'text-orange-600 font-bold text-center' : ''}`}
                          />
                        )}
                      </TableCell>
                    )
                  })
                ) : (
                  <>
                    <TableCell>
                      <Input
                        type="text"
                        placeholder="—"
                        value={valores[alumno.id] ?? ''}
                        onChange={e => handleChange(alumno.id, e.target.value.toUpperCase() === 'A' ? 'A' : e.target.value)}
                        className={`w-24 ${(valores[alumno.id] ?? '').toUpperCase() === 'A' ? 'text-orange-600 font-bold text-center' : ''}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        placeholder="—"
                        value={observaciones[alumno.id] ?? ''}
                        onChange={e => handleObservacion(alumno.id, e.target.value)}
                        disabled={(valores[alumno.id] ?? '').toUpperCase() === 'A'}
                        className="min-w-40"
                      />
                    </TableCell>
                    {notaAprobacion !== null && (
                      <TableCell className="text-sm">
                        {(() => {
                          const v = valores[alumno.id] ?? ''
                          if (v === '' || v.toUpperCase() === 'A') return <span className="text-muted-foreground">—</span>
                          return parseFloat(v) < notaAprobacion
                            ? <span className="text-destructive font-medium">✗ Reprobado</span>
                            : <span className="text-green-600 font-medium">✓ Aprobado</span>
                        })()}
                      </TableCell>
                    )}
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={handleExport}>
          <Download data-icon="inline-start" />
          Exportar Excel
        </Button>
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <Save data-icon="inline-start" />}
          {isPending ? 'Guardando...' : 'Guardar notas'}
        </Button>
      </div>

      {permiteRecuperatorio && !esRecuperatorio && (
        <div className="flex items-center justify-between rounded-md border p-3 bg-muted/30">
          <p className="text-sm text-muted-foreground">
            {recuperatorioId
              ? 'Recuperatorio generado.'
              : `${countBelowThreshold} alumno${countBelowThreshold !== 1 ? 's' : ''} por debajo del umbral de aprobación.`}
          </p>
          {recuperatorioId
            ? (
              <Button variant="outline" size="sm" render={<Link href={`/dashboard/${slug}/notas/${recuperatorioId}`} />}>
                Ver recuperatorio
              </Button>
            )
            : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerar}
                disabled={generando || countBelowThreshold === 0}
                title={countBelowThreshold === 0 ? 'Sin alumnos desaprobados' : undefined}
              >
                {generando ? 'Generando...' : 'Generar recuperatorio'}
              </Button>
            )
          }
        </div>
      )}

      {esRecuperatorio && (
        <p className="text-sm text-muted-foreground">Esta es la instancia de recuperatorio.</p>
      )}
    </div>
  )
}
