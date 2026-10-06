'use client'

import { useState, useMemo, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Save, Loader2, Download, ChevronsUpDown, ChevronUp, ChevronDown } from 'lucide-react'
import * as XLSX from 'xlsx'

interface Alumno {
  id: string
  nombre: string
  apellido: string | null
}

interface NotaExistente {
  id: string
  alumno_id: string
  valor_numerico: number | null
  valor_literal: string | null
  observacion: string | null
}

interface NotasEditorProps {
  evaluacionId: string
  evaluacionNombre: string
  alumnos: Alumno[]
  notasExistentes: NotaExistente[]
  slug: string
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

export function NotasEditor({ evaluacionId, evaluacionNombre, alumnos, notasExistentes, slug }: NotasEditorProps) {
  const notaMap = new Map(notasExistentes.map(n => [n.alumno_id, n]))

  const [valores, setValores] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const alumno of alumnos) {
      const nota = notaMap.get(alumno.id)
      if (nota?.valor_literal === 'A') {
        init[alumno.id] = ''
      } else {
        init[alumno.id] = nota?.valor_numerico?.toString() ?? nota?.valor_literal ?? ''
      }
    }
    return init
  })

  const [ausentes, setAusentes] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    for (const alumno of alumnos) {
      const nota = notaMap.get(alumno.id)
      init[alumno.id] = nota?.valor_literal === 'A'
    }
    return init
  })

  const [observaciones, setObservaciones] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const alumno of alumnos) {
      init[alumno.id] = notaMap.get(alumno.id)?.observacion ?? ''
    }
    return init
  })

  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [isPending, startTransition] = useTransition()

  const sortedAlumnos = useMemo(() => {
    return [...alumnos].sort((a, b) => {
      const cmp = displayNombre(a).localeCompare(displayNombre(b), 'es')
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [alumnos, sortDir])

  function handleChange(alumnoId: string, value: string) {
    setValores(prev => ({ ...prev, [alumnoId]: value }))
  }

  function handleAusente(alumnoId: string, checked: boolean) {
    setAusentes(prev => ({ ...prev, [alumnoId]: checked }))
    if (checked) {
      setValores(prev => ({ ...prev, [alumnoId]: '' }))
      setObservaciones(prev => ({ ...prev, [alumnoId]: '' }))
    }
  }

  function handleObservacion(alumnoId: string, value: string) {
    setObservaciones(prev => ({ ...prev, [alumnoId]: value }))
  }

  function handleExport() {
    const rows = sortedAlumnos.map(a => ({
      Alumno: displayNombre(a),
      Nota: ausentes[a.id] ? 'Ausente' : (valores[a.id] || '—'),
      Observación: ausentes[a.id] ? '' : (observaciones[a.id] ?? ''),
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Notas')
    XLSX.writeFile(wb, `${evaluacionNombre}.xlsx`)
  }

  async function handleSave() {
    const notas = alumnos.map(a => {
      if (ausentes[a.id]) {
        return { alumno_id: a.id, valor_numerico: null, valor_literal: 'A' }
      }
      const raw = valores[a.id]
      const num = raw !== '' ? parseFloat(raw) : null
      const obs = observaciones[a.id]?.trim()
      return { alumno_id: a.id, valor_numerico: num, valor_literal: null, ...(obs ? { observacion: obs } : {}) }
    })

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
              <TableHead className="w-32">Nota</TableHead>
              <TableHead className="w-24 text-center">Ausente</TableHead>
              <TableHead>Observación</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedAlumnos.map(alumno => (
              <TableRow key={alumno.id}>
                <TableCell className="font-medium">{displayNombre(alumno)}</TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    placeholder="—"
                    value={valores[alumno.id] ?? ''}
                    onChange={e => handleChange(alumno.id, e.target.value)}
                    disabled={ausentes[alumno.id]}
                    className="w-24"
                  />
                </TableCell>
                <TableCell className="text-center">
                  <input
                    type="checkbox"
                    checked={ausentes[alumno.id] ?? false}
                    onChange={e => handleAusente(alumno.id, e.target.checked)}
                    className="size-4 cursor-pointer accent-primary"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="text"
                    placeholder="—"
                    value={observaciones[alumno.id] ?? ''}
                    onChange={e => handleObservacion(alumno.id, e.target.value)}
                    disabled={ausentes[alumno.id]}
                    className="min-w-40"
                  />
                </TableCell>
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
    </div>
  )
}
