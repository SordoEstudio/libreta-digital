'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Save, Loader2 } from 'lucide-react'

interface Alumno {
  id: string
  nombre: string
  apellido: string | null
}

interface AsistenciaRow {
  alumno_id: string
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

type Valores = Record<string, { inasistencias: string; obs: string }>

export default function AsistenciaEditor({
  materiaId, periodoId, periodos, alumnos, asistenciaExistente, slug,
}: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  const existenteMap = new Map(asistenciaExistente.map(a => [a.alumno_id, a]))

  const [valores, setValores] = useState<Valores>(() => {
    const init: Valores = {}
    for (const alumno of alumnos) {
      const a = existenteMap.get(alumno.id)
      const total = a ? (a.inasistencias_justificadas + a.inasistencias_injustificadas) : 0
      init[alumno.id] = {
        inasistencias: total > 0 ? total.toString() : '',
        obs:           a?.observacion ?? '',
      }
    }
    return init
  })

  function setField(alumnoId: string, field: 'inasistencias' | 'obs', value: string) {
    setValores(prev => ({ ...prev, [alumnoId]: { ...prev[alumnoId], [field]: value } }))
  }

  function handlePeriodoChange(newPeriodoId: string | null) {
    if (!newPeriodoId) return
    router.push(`/dashboard/${slug}/materias/${materiaId}/asistencia?periodo_id=${newPeriodoId}`)
  }

  async function handleSave() {
    if (!periodoId) return

    const registros = alumnos.map(a => ({
      alumno_id:     a.id,
      inasistencias: parseInt(valores[a.id].inasistencias || '0', 10),
      observacion:   valores[a.id].obs || null,
    }))

    setSaving(true)
    try {
      const res = await fetch(`/api/v1/materias/${materiaId}/asistencia`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodo_id: periodoId, registros }),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        toast.error(json.error?.message ?? 'Error al guardar')
        return
      }

      toast.success('Asistencia guardada')
      router.refresh()
    } finally {
      setSaving(false)
    }
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
            <SelectValue placeholder="Seleccionar período">
              {periodoId ? periodos.find(p => p.id === periodoId)?.nombre : undefined}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {periodos.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={handleSave} disabled={saving || !periodoId}>
          {saving
            ? <Loader2 data-icon="inline-start" className="animate-spin" />
            : <Save data-icon="inline-start" />}
          {saving ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Alumno</TableHead>
              <TableHead className="w-36">Inasistencias</TableHead>
              <TableHead>Observación</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alumnos.map(alumno => {
              const v = valores[alumno.id]
              return (
                <TableRow key={alumno.id}>
                  <TableCell className="font-medium">{displayNombre(alumno)}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      value={v.inasistencias}
                      onChange={e => setField(alumno.id, 'inasistencias', e.target.value)}
                      className="w-24 h-8"
                    />
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
