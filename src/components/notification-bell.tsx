'use client'

import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Notificacion {
  id: string
  tipo: string
  titulo: string
  contenido: string | null
  leido: boolean
  created_at: string
}

export function NotificationBell() {
  const [items, setItems] = useState<Notificacion[]>([])
  const [sinLeer, setSinLeer] = useState(0)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/v1/notificaciones')
      .then(r => r.json())
      .then(json => {
        setItems((json.data ?? []).slice(0, 15))
        setSinLeer(json.meta?.sin_leer ?? 0)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  function handleOpenChange(open: boolean) {
    if (open && sinLeer > 0) {
      fetch('/api/v1/notificaciones/leer-todas', { method: 'PATCH' }).catch(() => {})
      setSinLeer(0)
    }
  }

  if (!loaded) return null

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger className="peer/menu-button group/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-hidden transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! [&_svg]:size-4 [&_svg]:shrink-0">
        <span className="relative shrink-0">
          <Bell className="size-4" />
          {sinLeer > 0 && (
            <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-red-500" />
          )}
        </span>
        <span className="group-data-[collapsible=icon]:hidden">Notificaciones</span>
        {sinLeer > 0 && (
          <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white group-data-[collapsible=icon]:hidden">
            {sinLeer > 9 ? '9+' : sinLeer}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent side="right" sideOffset={4} className="p-0" style={{ width: '320px' }}>
        <div className="border-b px-3 py-2">
          <p className="text-sm font-semibold">Notificaciones</p>
        </div>
        {items.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            Sin notificaciones nuevas
          </p>
        ) : (
          <div className="max-h-80 divide-y overflow-y-auto">
            {items.map(n => (
              <div key={n.id} className="px-3 py-2.5">
                <p className="text-sm font-medium leading-snug">{n.titulo}</p>
                {n.contenido && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{n.contenido}</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(n.created_at).toLocaleDateString('es-AR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
