'use client'

import type { HorarioEvento } from './page'

const DIAS = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const START_HOUR = 7
const END_HOUR = 21

const EVENT_COLORS = [
  'bg-blue-100 border-l-2 border-blue-400 text-blue-800 dark:bg-blue-950/60 dark:text-blue-200',
  'bg-violet-100 border-l-2 border-violet-400 text-violet-800 dark:bg-violet-950/60 dark:text-violet-200',
  'bg-emerald-100 border-l-2 border-emerald-400 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200',
  'bg-amber-100 border-l-2 border-amber-400 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200',
  'bg-rose-100 border-l-2 border-rose-400 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200',
  'bg-sky-100 border-l-2 border-sky-400 text-sky-800 dark:bg-sky-950/60 dark:text-sky-200',
  'bg-orange-100 border-l-2 border-orange-400 text-orange-800 dark:bg-orange-950/60 dark:text-orange-200',
  'bg-teal-100 border-l-2 border-teal-400 text-teal-800 dark:bg-teal-950/60 dark:text-teal-200',
]

function timeToMinutes(time: string): number {
  const parts = time.split(':')
  return parseInt(parts[0]) * 60 + parseInt(parts[1])
}

interface Props {
  horarios: HorarioEvento[]
}

export default function HorarioSemanal({ horarios }: Props) {
  if (horarios.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center rounded-lg border bg-muted/20">
        <p className="text-sm text-muted-foreground">Sin horarios cargados. Asigná horarios a las materias en Configuración.</p>
      </div>
    )
  }

  const usedDays = [...new Set(horarios.map(h => h.dia_semana))].sort()

  const allStartMins = horarios.map(h => timeToMinutes(h.hora_inicio))
  const allEndMins = horarios.map(h => timeToMinutes(h.hora_fin))
  const minHour = Math.max(START_HOUR, Math.floor(Math.min(...allStartMins) / 60) - 0)
  const maxHour = Math.min(END_HOUR, Math.ceil(Math.max(...allEndMins) / 60))
  const totalMinutes = (maxHour - minHour) * 60
  const PX_PER_MINUTE = 2
  const bodyHeight = totalMinutes * PX_PER_MINUTE

  // Conflict detection: group horarios by day, check overlaps
  const conflictIds = new Set<string>()
  for (const dia of usedDays) {
    const dayHorarios = horarios.filter(h => h.dia_semana === dia)
    for (let i = 0; i < dayHorarios.length; i++) {
      for (let j = i + 1; j < dayHorarios.length; j++) {
        const a = dayHorarios[i]
        const b = dayHorarios[j]
        const aStart = timeToMinutes(a.hora_inicio)
        const aEnd = timeToMinutes(a.hora_fin)
        const bStart = timeToMinutes(b.hora_inicio)
        const bEnd = timeToMinutes(b.hora_fin)
        if (aStart < bEnd && bStart < aEnd) {
          conflictIds.add(a.id)
          conflictIds.add(b.id)
        }
      }
    }
  }

  const hourMarks = Array.from({ length: maxHour - minHour + 1 }, (_, i) => minHour + i)

  return (
    <div className="rounded-lg border">
      {conflictIds.size > 0 && (
        <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/40 border-b text-xs text-amber-700 dark:text-amber-300">
          Se detectaron {conflictIds.size} conflicto{conflictIds.size !== 1 ? 's' : ''} de horario (bloques superpuestos).
        </div>
      )}
      <div className="w-full" style={{ overflowX: 'auto' }}>
        <div className="min-w-[480px]">
          {/* Day headers */}
          <div className="flex border-b bg-muted/30" style={{ paddingLeft: 52 }}>
            {usedDays.map(dia => (
              <div key={dia} className="flex-1 text-center text-xs font-semibold py-2.5">
                {DIAS[dia]}
              </div>
            ))}
          </div>

          {/* Body */}
          <div className="flex relative" style={{ height: bodyHeight }}>
            {/* Time column */}
            <div className="w-[52px] shrink-0 relative border-r bg-muted/10">
              {hourMarks.map(hour => (
                <div
                  key={hour}
                  className="absolute text-[10px] text-muted-foreground pr-2 text-right w-full leading-none"
                  style={{ top: (hour - minHour) * 60 * PX_PER_MINUTE - 5 }}
                >
                  {String(hour).padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {/* Day columns */}
            {usedDays.map(dia => (
              <div key={dia} className="flex-1 relative border-r last:border-r-0">
                {/* Hour lines */}
                {hourMarks.map(hour => (
                  <div
                    key={hour}
                    className="absolute w-full border-t border-border/40"
                    style={{ top: (hour - minHour) * 60 * PX_PER_MINUTE }}
                  />
                ))}

                {/* Events */}
                {horarios.filter(h => h.dia_semana === dia).map(h => {
                  const top = (timeToMinutes(h.hora_inicio) - minHour * 60) * PX_PER_MINUTE
                  const height = (timeToMinutes(h.hora_fin) - timeToMinutes(h.hora_inicio)) * PX_PER_MINUTE
                  const isConflict = conflictIds.has(h.id)
                  return (
                    <div
                      key={h.id}
                      className={`absolute inset-x-0.5 rounded overflow-hidden px-1.5 py-1 ${EVENT_COLORS[h.colorIndex]} ${isConflict ? 'ring-1 ring-amber-500' : ''}`}
                      style={{ top: top + 1, height: height - 2, zIndex: 10 }}
                    >
                      <p className="text-[11px] font-semibold leading-tight truncate">{h.materiaNombre}</p>
                      {height > 38 && h.cursoNombre && (
                        <p className="text-[10px] opacity-70 leading-tight truncate">{h.cursoNombre}</p>
                      )}
                      {height > 52 && h.aula && (
                        <p className="text-[10px] opacity-60 leading-tight truncate">{h.aula}</p>
                      )}
                      {height > 38 && (
                        <p className="text-[10px] opacity-60 leading-tight mt-0.5">
                          {h.hora_inicio.slice(0, 5)}–{h.hora_fin.slice(0, 5)}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
