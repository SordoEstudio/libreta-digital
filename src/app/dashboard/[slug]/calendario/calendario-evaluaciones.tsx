'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { EvaluacionEvento } from './page'

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const TIPO_LABELS: Record<string, string> = {
  parcial: 'Parcial',
  final: 'Final',
  recuperatorio: 'Recuperatorio',
  tp: 'TP',
  concepto: 'Concepto',
}

const DOT_COLORS = [
  'bg-blue-400',
  'bg-violet-400',
  'bg-emerald-400',
  'bg-amber-400',
  'bg-rose-400',
  'bg-sky-400',
  'bg-orange-400',
  'bg-teal-400',
]

interface Props {
  evaluaciones: EvaluacionEvento[]
}

export default function CalendarioEvaluaciones({ evaluaciones }: Props) {
  const today = new Date()
  const [mes, setMes] = useState(today.getMonth())
  const [año, setAño] = useState(today.getFullYear())
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  function prevMes() {
    if (mes === 0) { setMes(11); setAño(a => a - 1) }
    else setMes(m => m - 1)
  }
  function nextMes() {
    if (mes === 11) { setMes(0); setAño(a => a + 1) }
    else setMes(m => m + 1)
  }

  const firstDay = new Date(año, mes, 1)
  const daysInMonth = new Date(año, mes + 1, 0).getDate()
  // Mon=0 offset (JS getDay: 0=Sun)
  const startDow = (firstDay.getDay() + 6) % 7

  const evsByDate = new Map<string, EvaluacionEvento[]>()
  for (const ev of evaluaciones) {
    const list = evsByDate.get(ev.fecha) ?? []
    list.push(ev)
    evsByDate.set(ev.fecha, list)
  }

  const todayStr = today.toISOString().slice(0, 10)
  const selectedEvs = selectedDay ? (evsByDate.get(selectedDay) ?? []) : []

  const cells: (number | null)[] = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="flex flex-col gap-4">
      {evaluaciones.length === 0 && (
        <div className="rounded-lg border px-4 py-3 text-sm text-muted-foreground bg-muted/30">
          Sin evaluaciones con fecha asignada. Al crear evaluaciones podés asignarles una fecha para verlas aquí.
        </div>
      )}

      <div className="rounded-lg border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/30">
          <Button variant="ghost" size="icon" className="size-7" onClick={prevMes}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm font-semibold">{MESES[mes]} {año}</span>
          <Button variant="ghost" size="icon" className="size-7" onClick={nextMes}>
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <div className="grid grid-cols-7 border-b bg-muted/10">
          {DIAS_SEMANA.map(d => (
            <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {cells.map((day, idx) => {
            if (!day) {
              return <div key={`empty-${idx}`} className="border-b border-r aspect-square bg-muted/5" />
            }
            const dateStr = `${año}-${String(mes + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const evs = evsByDate.get(dateStr) ?? []
            const isToday = dateStr === todayStr
            const isSelected = dateStr === selectedDay

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                className={`border-b border-r aspect-square flex flex-col items-center gap-0.5 p-1 transition-colors cursor-pointer hover:bg-accent/50 ${isSelected ? 'bg-accent' : ''}`}
              >
                <span className={`text-xs leading-none rounded-full size-5 flex items-center justify-center ${isToday ? 'bg-primary text-primary-foreground font-semibold' : ''}`}>
                  {day}
                </span>
                {evs.length > 0 && (
                  <div className="flex flex-wrap gap-0.5 justify-center">
                    {evs.slice(0, 3).map(ev => (
                      <span key={ev.id} className={`size-1.5 rounded-full ${DOT_COLORS[ev.colorIndex]}`} />
                    ))}
                    {evs.length > 3 && (
                      <span className="text-[8px] text-muted-foreground leading-none">+{evs.length - 3}</span>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {selectedDay && selectedEvs.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">
            {new Date(selectedDay + 'T12:00:00').toLocaleDateString('es-AR', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            })}
          </p>
          <div className="flex flex-col gap-2">
            {selectedEvs.map(ev => (
              <div key={ev.id} className="flex items-center gap-3 rounded-lg border px-4 py-3">
                <span className={`size-2 rounded-full shrink-0 ${DOT_COLORS[ev.colorIndex]}`} />
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium truncate">{ev.nombre}</span>
                  <span className="text-xs text-muted-foreground truncate">
                    {ev.materiaNombre}{ev.cursoNombre ? ` · ${ev.cursoNombre}` : ''}
                  </span>
                </div>
                <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                  {TIPO_LABELS[ev.tipo] ?? ev.tipo}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
