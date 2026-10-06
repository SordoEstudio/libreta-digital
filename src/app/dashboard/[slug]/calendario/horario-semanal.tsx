'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { HorarioEvento } from '@/lib/horario-conflicts'
import { detectConflicts, conflictIdsSet } from '@/lib/horario-conflicts'

const DIAS = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const WEEKDAYS = [1, 2, 3, 4, 5]
const WEEKEND = [6, 7]

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

const START_HOUR = 7
const END_HOUR = 21

interface Props {
  horarios: HorarioEvento[]
  slug: string
  showConflicts?: boolean
}

export default function HorarioSemanal({ horarios, slug, showConflicts = true }: Props) {
  const router = useRouter()
  const [conflictDetailOpen, setConflictDetailOpen] = useState(false)

  const minHour = horarios.length > 0
    ? Math.max(START_HOUR, Math.floor(Math.min(...horarios.map(h => timeToMinutes(h.hora_inicio))) / 60))
    : 8
  const maxHour = horarios.length > 0
    ? Math.min(END_HOUR, Math.ceil(Math.max(...horarios.map(h => timeToMinutes(h.hora_fin))) / 60) + 1)
    : 18

  const PX_PER_MINUTE = 1
  const TOP_PAD = 10
  const bodyHeight = (maxHour - minHour) * 60 * PX_PER_MINUTE + TOP_PAD

  const conflictos = showConflicts ? detectConflicts(horarios) : []
  const conflictIds = conflictIdsSet(conflictos)

  const hasWeekend = WEEKEND.some(d => horarios.some(h => h.dia_semana === d))
  const visibleDays = hasWeekend ? [...WEEKDAYS, ...WEEKEND] : WEEKDAYS

  const hourMarks = Array.from({ length: maxHour - minHour }, (_, i) => minHour + i)

  return (
    <div className="rounded-lg border">
      {showConflicts && conflictos.length > 0 && (
        <div className="border-b bg-amber-50 dark:bg-amber-950/40">
          <button
            onClick={() => setConflictDetailOpen(v => !v)}
            className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left"
          >
            <span className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
              <span className="inline-flex size-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white shrink-0">
                {conflictos.length}
              </span>
              {conflictos.length === 1
                ? '1 conflicto de horario detectado'
                : `${conflictos.length} conflictos de horario detectados`}
            </span>
            {conflictDetailOpen
              ? <ChevronUp className="size-3.5 text-amber-600 shrink-0" />
              : <ChevronDown className="size-3.5 text-amber-600 shrink-0" />}
          </button>
          {conflictDetailOpen && (
            <div className="border-t border-amber-200 dark:border-amber-800 px-4 py-3 flex flex-col gap-3">
              {conflictos.map((c, i) => (
                <div key={i} className="flex flex-col gap-0.5">
                  <span className="text-xs font-semibold text-amber-800 dark:text-amber-200">
                    {c.tipo === 'docente' ? 'Docente' : 'Curso'}: {c.nombreRecurso} — {c.diaLabel}
                  </span>
                  <span className="text-xs text-amber-700/80 dark:text-amber-300/80">
                    <button
                      className="underline underline-offset-2 hover:no-underline"
                      onClick={() => router.push(`/dashboard/${slug}/materias/${c.horarioA.materiaId}/evaluaciones`)}
                    >
                      {c.horarioA.materiaNombre}
                    </button>
                    {' '}({c.horarioA.hora_inicio.slice(0, 5)}–{c.horarioA.hora_fin.slice(0, 5)})
                    {' '}se solapa con{' '}
                    <button
                      className="underline underline-offset-2 hover:no-underline"
                      onClick={() => router.push(`/dashboard/${slug}/materias/${c.horarioB.materiaId}/evaluaciones`)}
                    >
                      {c.horarioB.materiaNombre}
                    </button>
                    {' '}({c.horarioB.hora_inicio.slice(0, 5)}–{c.horarioB.hora_fin.slice(0, 5)})
                    {c.tipo === 'curso' ? ` · ${c.horarioA.cursoNombre}` : ` · ${c.horarioA.cursoNombre} / ${c.horarioB.cursoNombre}`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {horarios.length === 0 && (
        <div className="px-4 py-2 border-b bg-muted/20 text-xs text-muted-foreground">
          Sin horarios cargados. Asigná horarios a las materias en Configuración.
        </div>
      )}

      <div className="w-full" style={{ overflowX: 'auto', overflowY: 'hidden' }}>
        <div className="min-w-[560px]">
          <div className="flex border-b bg-muted/30" style={{ paddingLeft: 52 }}>
            {visibleDays.map(dia => (
              <div key={dia} className="flex-1 text-center text-xs font-semibold py-2.5">
                {DIAS[dia]}
              </div>
            ))}
          </div>

          <div className="flex relative" style={{ height: bodyHeight, overflow: 'hidden' }}>
            <div className="w-[52px] shrink-0 relative border-r bg-muted/10">
              {hourMarks.map(hour => (
                <div
                  key={hour}
                  className="absolute text-[10px] text-muted-foreground pr-2 text-right w-full leading-none"
                  style={{ top: TOP_PAD + (hour - minHour) * 60 * PX_PER_MINUTE - 5 }}
                >
                  {String(hour).padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {visibleDays.map(dia => (
              <div key={dia} className="flex-1 relative border-r last:border-r-0">
                {hourMarks.map(hour => (
                  <div
                    key={hour}
                    className="absolute w-full border-t border-border/40"
                    style={{ top: TOP_PAD + (hour - minHour) * 60 * PX_PER_MINUTE }}
                  />
                ))}

                {horarios.filter(h => h.dia_semana === dia).map(h => {
                  const top = TOP_PAD + (timeToMinutes(h.hora_inicio) - minHour * 60) * PX_PER_MINUTE
                  const height = (timeToMinutes(h.hora_fin) - timeToMinutes(h.hora_inicio)) * PX_PER_MINUTE
                  const isConflict = conflictIds.has(h.id)
                  return (
                    <button
                      key={h.id}
                      className={`absolute inset-x-0.5 rounded overflow-hidden px-1.5 py-1 text-left w-auto ${EVENT_COLORS[h.colorIndex]} ${isConflict ? 'ring-1 ring-amber-500' : ''}`}
                      style={{ top: top + 1, height: height - 2, zIndex: 10 }}
                      onClick={() => router.push(`/dashboard/${slug}/materias/${h.materiaId}/evaluaciones`)}
                    >
                      <p className="text-[11px] font-semibold leading-tight truncate">{h.materiaNombre}</p>
                      {height > 20 && (
                        <p className="text-[10px] opacity-60 leading-tight mt-0.5">
                          {h.hora_inicio.slice(0, 5)}–{h.hora_fin.slice(0, 5)}
                        </p>
                      )}
                      {height > 36 && h.cursoNombre && (
                        <p className="text-[10px] opacity-70 leading-tight truncate">{h.cursoNombre}</p>
                      )}
                      {height > 50 && h.aula && (
                        <p className="text-[10px] opacity-60 leading-tight truncate">{h.aula}</p>
                      )}
                    </button>
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
