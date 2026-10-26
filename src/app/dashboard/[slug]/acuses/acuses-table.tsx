'use client'

import { useState, useMemo } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Download, ChevronDown, ChevronRight } from 'lucide-react'

export type Responsable = {
  persona_id: string
  nombre: string
  apellido: string | null
  confirmed_at: string | null
}

export type AlumnoAcuse = {
  alumno_id: string
  alumno_nombre: string
  alumno_apellido: string | null
  curso_nombre: string | null
  responsables: Responsable[]
  confirmed_count: number
  total_count: number
  last_confirmed_at: string | null
}

interface Props {
  rows: AlumnoAcuse[]
  periodoNombre: string
}

type GrupoCurso = {
  nombre: string
  rows: AlumnoAcuse[]
  confirmados: number
  totalResponsables: number
}

function exportCsv(rows: AlumnoAcuse[], periodoNombre: string) {
  const header = 'Alumno,Apellido,Curso,Responsable,Resp. Apellido,Período,Fecha confirmación'
  const lines = rows.flatMap(r =>
    r.responsables.map(resp => [
      r.alumno_nombre,
      r.alumno_apellido ?? '',
      r.curso_nombre ?? '',
      resp.nombre,
      resp.apellido ?? '',
      periodoNombre,
      resp.confirmed_at ? new Date(resp.confirmed_at).toLocaleString('es-AR') : 'Sin confirmar',
    ].map(v => `"${v.replace(/"/g, '""')}"`).join(','))
  )
  const csv = [header, ...lines].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `acuses-${periodoNombre}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function AcusesTable({ rows, periodoNombre }: Props) {
  const [selectedAlumno, setSelectedAlumno] = useState<AlumnoAcuse | null>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const grupos: GrupoCurso[] = useMemo(() => {
    const map = new Map<string, AlumnoAcuse[]>()
    for (const row of rows) {
      const key = row.curso_nombre ?? '(Sin curso)'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(row)
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b, 'es'))
      .map(([nombre, grupoRows]) => ({
        nombre,
        rows: grupoRows,
        confirmados: grupoRows.reduce((sum, r) => sum + r.confirmed_count, 0),
        totalResponsables: grupoRows.reduce((sum, r) => sum + r.total_count, 0),
      }))
  }, [rows])

  function toggleCurso(nombre: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(nombre)) next.delete(nombre)
      else next.add(nombre)
      return next
    })
  }

  const multiGrupo = grupos.length > 1

  return (
    <>
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="text-sm text-muted-foreground">
          {rows.length} alumno{rows.length !== 1 ? 's' : ''}
          {multiGrupo && <span className="ml-1">· {grupos.length} cursos</span>}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportCsv(rows, periodoNombre)}
          disabled={rows.length === 0}
        >
          <Download data-icon="inline-start" />
          Exportar CSV
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {grupos.map(grupo => {
          const isCollapsed = collapsed.has(grupo.nombre)
          const allOk = grupo.confirmados === grupo.totalResponsables && grupo.totalResponsables > 0
          const noneOk = grupo.confirmados === 0

          return (
            <div key={grupo.nombre} className="rounded-lg border overflow-hidden">
              {multiGrupo && (
                <button
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/40 hover:bg-muted/60 transition-colors text-left"
                  onClick={() => toggleCurso(grupo.nombre)}
                >
                  <div className="flex items-center gap-3">
                    {isCollapsed
                      ? <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                      : <ChevronDown className="size-4 text-muted-foreground shrink-0" />
                    }
                    <span className="font-medium text-sm">{grupo.nombre}</span>
                    <span className="text-xs text-muted-foreground">
                      {grupo.rows.length} alumno{grupo.rows.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <span className={`text-xs font-medium ${allOk ? 'text-green-600' : noneOk ? 'text-destructive' : 'text-amber-600'}`}>
                    {grupo.confirmados}/{grupo.totalResponsables} confirmados
                  </span>
                </button>
              )}

              {!isCollapsed && (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/20">
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                        Alumno
                      </th>
                      {!multiGrupo && (
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide hidden sm:table-cell">
                          Curso
                        </th>
                      )}
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                        Confirmaciones
                      </th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide hidden md:table-cell">
                        Última confirmación
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {grupo.rows.map(row => {
                      const nombreCompleto = row.alumno_apellido
                        ? `${row.alumno_apellido}, ${row.alumno_nombre}`
                        : row.alumno_nombre

                      const allConfirmed = row.confirmed_count === row.total_count && row.total_count > 0
                      const noneConfirmed = row.confirmed_count === 0
                      const badgeVariant = allConfirmed ? 'default' : noneConfirmed ? 'destructive' : 'warning'
                      const badgeLabel = `${row.confirmed_count}/${row.total_count}${allConfirmed ? ' ✓' : ''}`

                      const lastConfirmed = row.last_confirmed_at
                        ? new Date(row.last_confirmed_at).toLocaleString('es-AR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'

                      return (
                        <tr
                          key={row.alumno_id}
                          className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                          onClick={() => setSelectedAlumno(row)}
                        >
                          <td className="px-4 py-2.5 font-medium">{nombreCompleto}</td>
                          {!multiGrupo && (
                            <td className="px-4 py-2.5 text-muted-foreground hidden sm:table-cell">
                              {row.curso_nombre ?? '—'}
                            </td>
                          )}
                          <td className="px-4 py-2.5">
                            <Badge
                              variant={badgeVariant}
                              className={allConfirmed ? 'bg-green-100 text-green-700 border-green-200' : undefined}
                            >
                              {badgeLabel}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap hidden md:table-cell">
                            {lastConfirmed}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )
        })}

        {rows.length === 0 && (
          <div className="rounded-lg border px-4 py-8 text-center text-sm text-muted-foreground">
            No hay alumnos inscriptos en este período.
          </div>
        )}
      </div>

      {/* Drawer — responsables detail */}
      <Sheet open={selectedAlumno !== null} onOpenChange={open => { if (!open) setSelectedAlumno(null) }}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>
              {selectedAlumno
                ? (selectedAlumno.alumno_apellido
                    ? `${selectedAlumno.alumno_apellido}, ${selectedAlumno.alumno_nombre}`
                    : selectedAlumno.alumno_nombre)
                : ''}
            </SheetTitle>
            {selectedAlumno?.curso_nombre && (
              <p className="text-sm text-muted-foreground">{selectedAlumno.curso_nombre}</p>
            )}
          </SheetHeader>

          <div className="flex flex-col gap-3 px-4 pb-4 overflow-y-auto">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Responsables — {periodoNombre}
            </p>
            {selectedAlumno?.responsables.map(resp => {
              const nombreResp = resp.apellido
                ? `${resp.apellido}, ${resp.nombre}`
                : resp.nombre
              return (
                <div key={resp.persona_id} className="flex items-center justify-between gap-2 py-2 border-b last:border-0">
                  <span className="font-medium text-sm">{nombreResp}</span>
                  {resp.confirmed_at ? (
                    <span className="text-xs text-green-600 whitespace-nowrap">
                      {new Date(resp.confirmed_at).toLocaleString('es-AR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Sin confirmar</span>
                  )}
                </div>
              )
            })}
            {selectedAlumno?.responsables.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">Sin responsables registrados.</p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
