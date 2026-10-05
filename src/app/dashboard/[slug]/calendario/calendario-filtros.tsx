'use client'

import { useState, useMemo } from 'react'
import type { HorarioEvento } from '@/lib/horario-conflicts'
import HorarioSemanal from './horario-semanal'

interface Props {
  horarios: HorarioEvento[]
  slug: string
}

const SELECT_CLASS = 'h-8 rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer'

export default function CalendarioFiltros({ horarios, slug }: Props) {
  const [cursoId, setCursoId] = useState('')
  const [docenteId, setDocenteId] = useState('')

  const cursos = useMemo(() => {
    const map = new Map<string, string>()
    for (const h of horarios) {
      if (h.cursoId && !map.has(h.cursoId)) map.set(h.cursoId, h.cursoNombre)
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], 'es'))
  }, [horarios])

  const docentes = useMemo(() => {
    const map = new Map<string, string>()
    for (const h of horarios) {
      if (h.docenteId && h.docenteNombre && !map.has(h.docenteId)) {
        map.set(h.docenteId, h.docenteNombre)
      }
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], 'es'))
  }, [horarios])

  const filtered = useMemo(() => {
    if (cursoId) return horarios.filter(h => h.cursoId === cursoId)
    if (docenteId) return horarios.filter(h => h.docenteId === docenteId)
    return horarios
  }, [horarios, cursoId, docenteId])

  const isFiltered = !!cursoId || !!docenteId

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={cursoId}
          onChange={e => { setCursoId(e.target.value); setDocenteId('') }}
          className={SELECT_CLASS}
          aria-label="Filtrar por curso"
        >
          <option value="">Todos los cursos</option>
          {cursos.map(([id, nombre]) => (
            <option key={id} value={id}>{nombre}</option>
          ))}
        </select>

        <select
          value={docenteId}
          onChange={e => { setDocenteId(e.target.value); setCursoId('') }}
          className={SELECT_CLASS}
          aria-label="Filtrar por docente"
        >
          <option value="">Todos los docentes</option>
          {docentes.map(([id, nombre]) => (
            <option key={id} value={id}>{nombre}</option>
          ))}
        </select>

        {isFiltered && (
          <button
            onClick={() => { setCursoId(''); setDocenteId('') }}
            className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground rounded-md border border-input bg-background transition-colors"
          >
            Limpiar ×
          </button>
        )}

        {!isFiltered && horarios.length > 0 && (
          <span className="text-xs text-muted-foreground">
            Seleccioná un curso o docente para una vista más clara
          </span>
        )}
      </div>

      <HorarioSemanal horarios={filtered} slug={slug} showConflicts={true} />
    </div>
  )
}
