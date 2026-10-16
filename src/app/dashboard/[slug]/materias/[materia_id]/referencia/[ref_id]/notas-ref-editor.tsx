'use client'

import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Save, Loader2, ChevronsUpDown, ChevronUp, ChevronDown } from 'lucide-react'
import { calcPromedioReferencia } from '@/lib/notas-referencia'

interface Alumno {
  id: string
  nombre: string
  apellido: string | null
}

interface Dimension {
  id: string
  nombre: string
}

interface NotaExistente {
  alumno_id: string
  dimension_id: string | null
  valor_numerico: number | null
  valor_literal: string | null
  observacion: string | null
}

interface Props {
  evalRefId: string
  tipo: 'numerica' | 'conceptual'
  alumnos: Alumno[]
  notasExistentes: NotaExistente[]
  dimensiones: Dimension[]
}

type SortDir = 'asc' | 'desc'

function displayNombre(a: Alumno) {
  return a.apellido ? `${a.apellido}, ${a.nombre}` : a.nombre
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown className="size-3 ml-1 opacity-40" />
  return dir === 'asc' ? <ChevronUp className="size-3 ml-1" /> : <ChevronDown className="size-3 ml-1" />
}

// Key for a nota: alumno_id + dim_id (or '__' if no dim)
function notaKey(alumnoId: string, dimId: string | null) {
  return `${alumnoId}::${dimId ?? '__'}`
}

export default function NotasRefEditor({ evalRefId, tipo, alumnos, notasExistentes, dimensiones }: Props) {
  const hasDims = dimensiones.length > 0

  // valores: key → string value
  const [valores, setValores] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const n of notasExistentes) {
      const k = notaKey(n.alumno_id, n.dimension_id)
      init[k] = n.valor_numerico?.toString() ?? n.valor_literal ?? ''
    }
    return init
  })

  // observaciones: only for no-dim (legacy support)
  const [observaciones, setObservaciones] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    if (!hasDims) {
      for (const n of notasExistentes) {
        init[n.alumno_id] = n.observacion ?? ''
      }
    }
    return init
  })

  const [saving, setSaving] = useState(false)
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const sorted = useMemo(() => {
    return [...alumnos].sort((a, b) => {
      const aKey = `${a.apellido ?? ''}\x00${a.nombre}`.toLowerCase()
      const bKey = `${b.apellido ?? ''}\x00${b.nombre}`.toLowerCase()
      const cmp = aKey.localeCompare(bKey, 'es')
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [alumnos, sortDir])

  const promedio = useMemo(() => {
    if (tipo !== 'numerica') return null
    if (hasDims) {
      // promedio de todos los valores por dimensión promediados por alumno
      const promediosPorAlumno = alumnos.map(a => {
        const vals = dimensiones.map(d => {
          const v = parseFloat(valores[notaKey(a.id, d.id)])
          return Number.isFinite(v) ? v : null
        }).filter((v): v is number => v !== null)
        return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : null
      })
      const valid = promediosPorAlumno.filter((v): v is number => v !== null)
      return valid.length > 0
        ? Math.round((valid.reduce((s, v) => s + v, 0) / valid.length) * 100) / 100
        : null
    }
    const notas = alumnos.map(a => {
      const parsed = parseFloat(valores[notaKey(a.id, null)])
      return { valor_numerico: Number.isFinite(parsed) ? parsed : null }
    })
    return calcPromedioReferencia(notas)
  }, [alumnos, valores, tipo, hasDims, dimensiones])

  function setValor(alumnoId: string, dimId: string | null, val: string) {
    setValores(prev => ({ ...prev, [notaKey(alumnoId, dimId)]: val }))
  }

  async function handleGuardar() {
    setSaving(true)

    let notas: object[]
    if (hasDims) {
      notas = alumnos.flatMap(alumno =>
        dimensiones.map(dim => {
          const val = valores[notaKey(alumno.id, dim.id)]?.trim() ?? ''
          const numerico = tipo === 'numerica' ? (val !== '' ? parseFloat(val) : null) : null
          const literal = tipo === 'conceptual' ? (val !== '' ? val : null) : null
          return {
            alumno_id: alumno.id,
            dimension_id: dim.id,
            valor_numerico: numerico,
            valor_literal: literal,
          }
        })
      )
    } else {
      notas = alumnos.map(alumno => {
        const val = valores[notaKey(alumno.id, null)]?.trim() ?? ''
        const obs = observaciones[alumno.id]?.trim() ?? ''
        const numerico = tipo === 'numerica' ? (val !== '' ? parseFloat(val) : null) : null
        const literal = tipo === 'conceptual' ? (val !== '' ? val : null) : null
        return {
          alumno_id: alumno.id,
          dimension_id: null,
          valor_numerico: numerico,
          valor_literal: literal,
          observacion: obs || undefined,
        }
      })
    }

    const res = await fetch('/api/v1/notas-referencia/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evaluacion_ref_id: evalRefId, notas }),
    })

    const json = await res.json()
    setSaving(false)

    if (!res.ok) {
      toast.error(json.error?.message ?? 'Error al guardar')
      return
    }

    toast.success(`Guardado (${json.data.upserted} notas)`)
  }

  if (alumnos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">Sin alumnos inscriptos en este curso.</p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-40">
                <button
                  className="flex items-center text-xs font-medium hover:text-foreground transition-colors"
                  onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                >
                  Apellido, Nombre
                  <SortIcon active dir={sortDir} />
                </button>
              </TableHead>
              {hasDims ? (
                dimensiones.map(d => (
                  <TableHead key={d.id} className="w-28 text-center">{d.nombre}</TableHead>
                ))
              ) : (
                <>
                  <TableHead className="w-32">{tipo === 'numerica' ? 'Nota' : 'Concepto'}</TableHead>
                  <TableHead>Observación</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map(alumno => (
              <TableRow key={alumno.id}>
                <TableCell className="font-medium">{displayNombre(alumno)}</TableCell>
                {hasDims ? (
                  dimensiones.map(dim => (
                    <TableCell key={dim.id} className="text-center">
                      <Input
                        value={valores[notaKey(alumno.id, dim.id)] ?? ''}
                        onChange={e => setValor(alumno.id, dim.id, e.target.value)}
                        className="h-8 w-20 text-sm text-center mx-auto"
                        placeholder={tipo === 'numerica' ? '—' : '—'}
                      />
                    </TableCell>
                  ))
                ) : (
                  <>
                    <TableCell>
                      <Input
                        value={valores[notaKey(alumno.id, null)] ?? ''}
                        onChange={e => setValor(alumno.id, null, e.target.value)}
                        className="h-8 w-24 text-sm"
                        placeholder={tipo === 'numerica' ? '0–10' : 'Ej: MB'}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={observaciones[alumno.id] ?? ''}
                        onChange={e => setObservaciones(prev => ({ ...prev, [alumno.id]: e.target.value }))}
                        className="h-8 text-sm"
                        placeholder="Observación (opcional)"
                      />
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        {promedio !== null ? (
          <span className="text-sm text-muted-foreground">
            Promedio del curso: <strong>{promedio}</strong>
          </span>
        ) : (
          <span />
        )}
        <Button onClick={handleGuardar} disabled={saving}>
          {saving
            ? <><Loader2 data-icon="inline-start" className="animate-spin" />Guardando...</>
            : <><Save data-icon="inline-start" />Guardar</>
          }
        </Button>
      </div>
    </div>
  )
}
