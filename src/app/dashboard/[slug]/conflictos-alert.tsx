'use client'

import { useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { Conflicto } from '@/lib/horario-conflicts'

interface Props {
  conflictos: Conflicto[]
  slug: string
}

export function ConflictosAlert({ conflictos, slug }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  if (conflictos.length === 0) return null

  const label = conflictos.length === 1
    ? '1 conflicto de horario detectado'
    : `${conflictos.length} conflictos de horario detectados`

  return (
    <div className="rounded-lg border border-warning-border bg-warning-muted overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-4 shrink-0 text-warning" />
          <span className="text-sm">{label}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-warning/70">{open ? 'Ocultar' : 'Ver detalle'}</span>
          {open ? <ChevronUp className="size-3.5 text-warning" /> : <ChevronDown className="size-3.5 text-warning" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-warning-border px-4 py-3 flex flex-col gap-3">
          {conflictos.map((c, i) => (
            <div key={i} className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-foreground">
                {c.tipo === 'docente' ? 'Docente' : 'Curso'}: {c.nombreRecurso} — {c.diaLabel}
              </span>
              <p className="text-xs text-muted-foreground">
                <button
                  className="underline underline-offset-2 hover:no-underline"
                  onClick={() => router.push(`/dashboard/${slug}/materias/${c.horarioA.materiaId}`)}
                >
                  {c.horarioA.materiaNombre}
                </button>
                {' '}({c.horarioA.hora_inicio.slice(0, 5)}–{c.horarioA.hora_fin.slice(0, 5)})
                {' '}se solapa con{' '}
                <button
                  className="underline underline-offset-2 hover:no-underline"
                  onClick={() => router.push(`/dashboard/${slug}/materias/${c.horarioB.materiaId}`)}
                >
                  {c.horarioB.materiaNombre}
                </button>
                {' '}({c.horarioB.hora_inicio.slice(0, 5)}–{c.horarioB.hora_fin.slice(0, 5)})
                {c.tipo === 'curso' && ` · ${c.horarioA.cursoNombre}`}
                {c.tipo === 'docente' && ` · ${c.horarioA.cursoNombre} / ${c.horarioB.cursoNombre}`}
              </p>
            </div>
          ))}
          <button
            onClick={() => router.push(`/dashboard/${slug}/calendario`)}
            className="text-xs text-primary mt-1 text-left hover:underline"
          >
            Ver en Calendario →
          </button>
        </div>
      )}
    </div>
  )
}
