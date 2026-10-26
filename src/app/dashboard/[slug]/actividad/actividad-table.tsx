'use client'

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Search, X } from 'lucide-react'

const ACCION_LABELS: Record<string, string> = {
  crear_usuario: 'Creó usuario',
  editar_usuario: 'Editó usuario',
  cambiar_rol: 'Cambió rol',
  activar_usuario: 'Activó usuario',
  desactivar_usuario: 'Desactivó usuario',
  invitar_usuario: 'Reenvió invitación',
  confirmar_boletin: 'Confirmó boletín',
  quitar_confirmacion_boletin: 'Quitó confirmación',
}

function metadataResumen(accion: string, metadata: Record<string, unknown> | null): string {
  if (!metadata) return ''
  if (accion === 'crear_usuario' || accion === 'editar_usuario') {
    const parts: string[] = []
    if (metadata.nombre) parts.push(String(metadata.nombre))
    if (metadata.email) parts.push(String(metadata.email))
    if (metadata.rol) parts.push(`(${metadata.rol})`)
    return parts.join(' ')
  }
  if (accion === 'cambiar_rol') {
    return metadata.rol_nuevo ? `→ ${metadata.rol_nuevo}` : ''
  }
  return ''
}

export type ActividadRow = {
  id: string
  accion: string
  entidad: string | null
  entidad_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  personas: { nombre: string; apellido: string | null } | null
}

interface Props {
  rows: ActividadRow[]
}

export function ActividadTable({ rows }: Props) {
  const [query, setQuery] = useState('')
  const [accionFiltro, setAccionFiltro] = useState<string | null>(null)

  const accionesUnicas = useMemo(() => {
    const set = new Set(rows.map(r => r.accion))
    return [...set].sort((a, b) =>
      (ACCION_LABELS[a] ?? a).localeCompare(ACCION_LABELS[b] ?? b, 'es')
    )
  }, [rows])

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter(row => {
      if (accionFiltro && row.accion !== accionFiltro) return false
      if (!q) return true
      const persona = row.personas
      const nombre = persona
        ? `${persona.nombre} ${persona.apellido ?? ''}`.toLowerCase()
        : ''
      const label = (ACCION_LABELS[row.accion] ?? row.accion).toLowerCase()
      const detalle = metadataResumen(row.accion, row.metadata).toLowerCase()
      return nombre.includes(q) || label.includes(q) || detalle.includes(q)
    })
  }, [rows, query, accionFiltro])

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar por persona o acción…"
            className="pl-9 pr-8"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted"
            >
              <X className="size-3.5 text-muted-foreground" />
            </button>
          )}
        </div>

        {accionesUnicas.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {accionesUnicas.map(accion => (
              <button
                key={accion}
                onClick={() => setAccionFiltro(accion === accionFiltro ? null : accion)}
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
                  accionFiltro === accion
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {ACCION_LABELS[accion] ?? accion}
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {filtrados.length} de {rows.length} entradas
        {(query || accionFiltro) && (
          <button
            className="ml-2 underline hover:no-underline"
            onClick={() => { setQuery(''); setAccionFiltro(null) }}
          >
            Limpiar filtros
          </button>
        )}
      </p>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Fecha</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide hidden sm:table-cell">Quién</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Acción</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide hidden md:table-cell">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map(row => {
              const persona = row.personas
              const nombrePersona = persona
                ? persona.apellido ? `${persona.apellido}, ${persona.nombre}` : persona.nombre
                : '—'
              const label = ACCION_LABELS[row.accion] ?? row.accion
              const detalle = metadataResumen(row.accion, row.metadata)
              const fecha = new Date(row.created_at)
              return (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                    <span title={fecha.toLocaleString('es-AR')}>
                      {fecha.toLocaleDateString('es-AR')}
                    </span>
                    <span className="block text-xs text-muted-foreground/60">
                      {fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 hidden sm:table-cell">{nombrePersona}</td>
                  <td className="px-4 py-2.5 font-medium">{label}</td>
                  <td className="px-4 py-2.5 text-muted-foreground hidden md:table-cell">{detalle}</td>
                </tr>
              )
            })}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {rows.length === 0 ? 'Sin actividad registrada.' : 'Sin resultados para los filtros aplicados.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
