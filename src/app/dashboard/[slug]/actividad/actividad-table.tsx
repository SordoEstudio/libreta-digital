'use client'

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { SearchableSelect } from '@/components/ui/searchable-select'
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
  reabrir_periodo: 'Reabrió período',
  publicar_periodo: 'Publicó período',
  despublicar_periodo: 'Despublicó período',
  publicar_periodo_curso: 'Publicó período (curso)',
  despublicar_periodo_curso: 'Despublicó período (curso)',
  cerrar_curso: 'Cerró curso',
  reabrir_curso: 'Reabrió curso',
  notificar_curso: 'Notificó curso',
  cargar_notas: 'Cargó notas',
  cargar_notas_referencia: 'Cargó notas de referencia',
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
  if (accion === 'reabrir_periodo' || accion === 'publicar_periodo' || accion === 'despublicar_periodo') {
    return metadata.periodo_nombre ? String(metadata.periodo_nombre) : ''
  }
  if (accion === 'publicar_periodo_curso' || accion === 'despublicar_periodo_curso' || accion === 'cerrar_curso' || accion === 'reabrir_curso') {
    const parts: string[] = []
    if (metadata.periodo_nombre) parts.push(String(metadata.periodo_nombre))
    if (metadata.curso_nombre) parts.push(String(metadata.curso_nombre))
    return parts.join(' · ')
  }
  if (accion === 'notificar_curso') {
    const parts: string[] = []
    if (metadata.periodo_nombre) parts.push(String(metadata.periodo_nombre))
    if (metadata.curso_nombre) parts.push(String(metadata.curso_nombre))
    if (metadata.enviados != null) parts.push(`(${metadata.enviados} emails)`)
    return parts.join(' · ')
  }
  if (accion === 'cargar_notas') {
    const parts: string[] = []
    if (metadata.materia_nombre) parts.push(String(metadata.materia_nombre))
    if (metadata.evaluacion_nombre) parts.push(String(metadata.evaluacion_nombre))
    if (metadata.count) parts.push(`(${metadata.count} notas)`)
    return parts.join(' · ')
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

  const accionOptions = useMemo(() => {
    const set = new Set(rows.map(r => r.accion))
    const opciones = [...set]
      .sort((a, b) => (ACCION_LABELS[a] ?? a).localeCompare(ACCION_LABELS[b] ?? b, 'es'))
      .map(a => ({ value: a, label: ACCION_LABELS[a] ?? a }))
    return [{ value: '', label: 'Todas las acciones' }, ...opciones]
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

        {accionOptions.length > 2 && (
          <div className="w-56">
            <SearchableSelect
              options={accionOptions}
              value={accionFiltro ?? ''}
              onValueChange={v => setAccionFiltro(v === '' ? null : v)}
              placeholder="Filtrar por acción"
              searchPlaceholder="Buscar acción…"
            />
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
