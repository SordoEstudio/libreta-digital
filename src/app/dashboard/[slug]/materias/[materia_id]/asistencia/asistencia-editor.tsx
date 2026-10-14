'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Save, Loader2 } from 'lucide-react'
import { calcularPorcentajeAsistencia } from '@/lib/asistencia'

interface Alumno {
  id: string
  nombre: string
  apellido: string | null
}

interface AsistenciaRow {
  alumno_id: string
  total_clases: number
  inasistencias_justificadas: number
  inasistencias_injustificadas: number
  observacion: string | null
}

interface Props {
  materiaId: string
  periodoId: string | null
  periodos: Array<{ id: string; nombre: string }>
  alumnos: Alumno[]
  asistenciaExistente: AsistenciaRow[]
  slug: string
}

function displayNombre(a: Alumno) {
  return a.apellido ? `${a.apellido}, ${a.nombre}` : a.nombre
}

type Valores = Record<string, {
  total: string
  justif: string
  injustif: string
  obs: string
}>

export default function AsistenciaEditor({
  materiaId, periodoId, periodos, alumnos, asistenciaExistente, slug,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const existenteMap = new Map(asistenciaExistente.map(a => [a.alumno_id, a]))

  const [valores, setValores] = useState<Valores>(() => {
    const init: Valores = {}
    for (const alumno of alumnos) {
      const a = existenteMap.get(alumno.id)
      init[alumno.id] = {
        total:    a?.total_clases.toString() ?? '',
        justif:   a?.inasistencias_justificadas.toString() ?? '',
        injustif: a?.inasistencias_injustificadas.toString() ?? '',
        obs:      a?.observacion ?? '',
      }
    }
    return init
  })

  function setField(alumnoId: string, field: 'total' | 'justif' | 'injustif' | 'obs', value: string) {
    setValores(prev => ({ ...prev, [alumnoId]: { ...prev[alumnoId], [field]: value } }))
  }

  function handlePeriodoChange(newPeriodoId: string | null) {
    if (!newPeriodoId) return
    router.push(`/dashboard/${slug}/materias/${materiaId}/asistencia?periodo_id=${newPeriodoId}`)
  }

  function handleSave() {
    if (!periodoId) return

    const registros = alumnos
      .map(a => {
        const v = valores[a.id]
        return {
          alumno_id:                    a.id,
          total_clases:                 parseInt(v.total || '0', 10),
          inasistencias_justificadas:   parseInt(v.justif || '0', 10),
          inasistencias_injustificadas: parseInt(v.injustif || '0', 10),
          observacion:                  v.obs || null,
        }
      })

    startTransition(async () => {
      const res = await fetch(`/api/v1/materias/${materiaId}/asistencia`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodo_id: periodoId, registros }),
      })

      if (!res.ok) {
        const json = await res.json()
        toast.error(json.error?.message ?? 'Error al guardar')
        return
      }

      toast.success('Asistencia guardada')
      router.refresh()
    })
  }

  if (alumnos.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center">Sin alumnos inscriptos en este curso.</p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <Select value={periodoId ?? ''} onValueChange={handlePeriodoChange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Seleccionar período" />
          </SelectTrigger>
          <SelectContent>
            {periodos.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={handleSave} disabled={isPending || !periodoId}>
          {isPending
            ? <Loader2 data-icon="inline-start" className="animate-spin" />
            : <Save data-icon="inline-start" />}
          {isPending ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Alumno</TableHead>
              <TableHead className="w-32">Total clases</TableHead>
              <TableHead className="w-36">Inasist. justif.</TableHead>
              <TableHead className="w-36">Inasist. injustif.</TableHead>
              <TableHead className="w-24 text-center">Asistencia</TableHead>
              <TableHead>Observación</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alumnos.map(alumno => {
              const v = valores[alumno.id]
              const total = parseInt(v.total || '0', 10)
              const justif = parseInt(v.justif || '0', 10)
              const injustif = parseInt(v.injustif || '0', 10)
              const pct = calcularPorcentajeAsistencia(total, justif, injustif)

              return (
                <TableRow key={alumno.id}>
                  <TableCell className="font-medium">{displayNombre(alumno)}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      value={v.total}
                      onChange={e => setField(alumno.id, 'total', e.target.value)}
                      className="w-24 h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      value={v.justif}
                      onChange={e => setField(alumno.id, 'justif', e.target.value)}
                      className="w-24 h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      value={v.injustif}
                      onChange={e => setField(alumno.id, 'injustif', e.target.value)}
                      className="w-24 h-8"
                    />
                  </TableCell>
                  <TableCell className="text-center font-semibold">
                    {pct !== null ? `${pct}%` : '—'}
                  </TableCell>
                  <TableCell>
                    <Input
                      value={v.obs}
                      onChange={e => setField(alumno.id, 'obs', e.target.value)}
                      placeholder="Opcional"
                      className="h-8"
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
