'use client'

import { Tooltip } from '@base-ui/react/tooltip'

interface Resp {
  persona_id: string
  nombre: string
  apellido?: string | null
  email: string | null
  relacion: string | null
}

function displayNombre(r: Resp) {
  if (r.apellido) return `${r.apellido}, ${r.nombre}`
  return r.nombre
}

function initials(r: Resp) {
  const full = r.apellido ? `${r.apellido} ${r.nombre}` : r.nombre
  return full
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase()
}

export function ResponsablesChips({ responsables }: { responsables: Resp[] }) {
  if (responsables.length === 0) {
    return <span className="text-muted-foreground text-xs">—</span>
  }

  const MAX = 2
  const shown = responsables.slice(0, MAX)
  const rest = responsables.length - MAX

  return (
    <Tooltip.Provider delay={300}>
      <div className="flex items-center gap-1">
        {shown.map(r => (
          <Tooltip.Root key={r.persona_id}>
            <Tooltip.Trigger
              render={
                <div className="inline-flex size-6 items-center justify-center rounded-full bg-muted text-[10px] font-semibold cursor-default select-none ring-1 ring-border" />
              }
            >
              {initials(r)}
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Positioner sideOffset={6}>
                <Tooltip.Popup className="z-50 max-w-[180px] rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md">
                  <p className="font-medium">{displayNombre(r)}</p>
                  {r.email && <p className="mt-0.5 text-muted-foreground">{r.email}</p>}
                  {r.relacion && <p className="mt-0.5 text-muted-foreground">{r.relacion}</p>}
                </Tooltip.Popup>
              </Tooltip.Positioner>
            </Tooltip.Portal>
          </Tooltip.Root>
        ))}
        {rest > 0 && (
          <span className="inline-flex items-center justify-center rounded-full bg-muted px-1.5 text-[10px] font-medium text-muted-foreground ring-1 ring-border">
            +{rest}
          </span>
        )}
      </div>
    </Tooltip.Provider>
  )
}
