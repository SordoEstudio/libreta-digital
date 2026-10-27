'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface Props {
  nombre: string
  badges: React.ReactNode
  headerActions: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
}

export function PeriodoCierreCollapsible({ nombre, badges, headerActions, children, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="flex flex-col gap-0">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2 flex-1 text-left min-w-0 py-0.5"
        >
          {open
            ? <ChevronDown className="size-4 text-muted-foreground shrink-0" />
            : <ChevronRight className="size-4 text-muted-foreground shrink-0" />
          }
          <span className="text-sm font-medium">{nombre}</span>
          <div className="flex items-center gap-1 flex-wrap">{badges}</div>
        </button>
        <div className="flex items-center gap-1">{headerActions}</div>
      </div>
      {open && <div className="mt-3 ml-6">{children}</div>}
    </div>
  )
}
