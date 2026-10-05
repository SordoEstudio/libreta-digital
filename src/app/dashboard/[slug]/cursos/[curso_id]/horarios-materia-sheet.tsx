'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Clock, Plus, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

export interface HorarioSlot {
  id: string
  dia_semana: number
  hora_inicio: string
  hora_fin: string
  aula: string | null
}

interface Props {
  materiaId: string
  materiaNombre: string
  slots: HorarioSlot[]
}

export default function HorariosSheet({ materiaId, materiaNombre, slots: initialSlots }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [horarios, setHorarios] = useState<HorarioSlot[]>(initialSlots)
  const [dia, setDia] = useState('1')
  const [horaInicio, setHoraInicio] = useState('08:00')
  const [horaFin, setHoraFin] = useState('09:00')
  const [aula, setAula] = useState('')
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleAdd() {
    setAdding(true)
    const res = await fetch(`/api/v1/materias/${materiaId}/horarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dia_semana: parseInt(dia),
        hora_inicio: horaInicio,
        hora_fin: horaFin,
        aula: aula.trim() || undefined,
      }),
    })
    const json = await res.json()
    setAdding(false)

    if (!res.ok) {
      toast.error(json.error?.message ?? 'Error al agregar horario')
      return
    }
    setHorarios(prev => [...prev, json.data].sort((a, b) =>
      a.dia_semana !== b.dia_semana ? a.dia_semana - b.dia_semana : a.hora_inicio.localeCompare(b.hora_inicio)
    ))
    setAula('')
    router.refresh()
  }

  async function handleDelete(horarioId: string) {
    setDeletingId(horarioId)
    const res = await fetch(`/api/v1/materias/${materiaId}/horarios/${horarioId}`, { method: 'DELETE' })
    setDeletingId(null)

    if (!res.ok) {
      toast.error('Error al eliminar horario')
      return
    }
    setHorarios(prev => prev.filter(s => s.id !== horarioId))
    router.refresh()
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2"
        onClick={() => setOpen(true)}
      >
        <Clock className="size-3" />
        {horarios.length === 0 ? 'Agregar horario' : `${horarios.length} horario${horarios.length !== 1 ? 's' : ''}`}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Horarios — {materiaNombre}</SheetTitle>
          </SheetHeader>

          <div className="flex flex-col gap-5 mt-6 px-4">
            {horarios.length > 0 ? (
              <div className="flex flex-col gap-1">
                {horarios.map(horario => (
                  <div key={horario.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                    <span className="font-medium">{DIAS[horario.dia_semana]}</span>
                    <span className="text-muted-foreground">
                      {horario.hora_inicio.slice(0, 5)}–{horario.hora_fin.slice(0, 5)}
                      {horario.aula ? ` · ${horario.aula}` : ''}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="size-7 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(horario.id)}
                      disabled={deletingId === horario.id}
                    >
                      {deletingId === horario.id
                        ? <Loader2 className="size-3.5 animate-spin" />
                        : <Trash2 className="size-3.5" />}
                      <span className="sr-only">Eliminar horario</span>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sin horarios cargados.</p>
            )}

            <div className="flex flex-col gap-3 border-t pt-4">
              <p className="text-sm font-medium">Agregar horario</p>

              <div className="flex flex-col gap-1.5">
                <Label>Día</Label>
                <Select value={dia} onValueChange={v => setDia(v ?? '1')}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue>{DIAS[parseInt(dia)]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {DIAS.slice(1).map((d, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1.5">
                  <Label>Hora inicio</Label>
                  <Input
                    type="time"
                    value={horaInicio}
                    onChange={e => setHoraInicio(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Hora fin</Label>
                  <Input
                    type="time"
                    value={horaFin}
                    onChange={e => setHoraFin(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Aula <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                <Input
                  placeholder="Ej: Aula 3B"
                  value={aula}
                  onChange={e => setAula(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>

              <Button onClick={handleAdd} disabled={adding} className="mt-1">
                {adding
                  ? <Loader2 data-icon="inline-start" className="animate-spin" />
                  : <Plus data-icon="inline-start" />}
                {adding ? 'Agregando...' : 'Agregar horario'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
