'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, Loader2 } from 'lucide-react'
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

const LIMIT = 50

export function NotificationBell({ compact = false }: { compact?: boolean }) {
  const [items, setItems] = useState<Notificacion[]>([])
  const [sinLeer, setSinLeer] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  const fetchPage = useCallback(async (offset: number) => {
    const res = await fetch(`/api/v1/notificaciones?offset=${offset}`)
    const json = await res.json()
    return {
      items: (json.data ?? []) as Notificacion[],
      sinLeer: json.meta?.sin_leer ?? 0,
      hasMore: json.meta?.has_more ?? false,
    }
  }, [])

  useEffect(() => {
    fetchPage(0)
      .then(({ items, sinLeer, hasMore }) => {
        setItems(items)
        setSinLeer(sinLeer)
        setHasMore(hasMore)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [fetchPage])

  async function handleLoadMore() {
    setLoadingMore(true)
    try {
      const { items: next, hasMore: more } = await fetchPage(items.length)
      setItems(prev => [...prev, ...next])
      setHasMore(more)
    } finally {
      setLoadingMore(false)
    }
  }

  function handleOpenChange(open: boolean) {
    if (open && sinLeer > 0) {
      fetch('/api/v1/notificaciones/leer-todas', { method: 'PATCH' }).catch(() => {})
      setSinLeer(0)
    }
  }

  if (!loaded) return null

  const listContent = (
    <>
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
                  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                })}
              </p>
            </div>
          ))}
        </div>
      )}
      {hasMore && (
        <div className="border-t px-3 py-2">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="flex w-full items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            {loadingMore && <Loader2 className="size-3 animate-spin" />}
            Ver más
          </button>
        </div>
      )}
    </>
  )

  if (compact) {
    return (
      <DropdownMenu onOpenChange={handleOpenChange}>
        <DropdownMenuTrigger className="relative flex size-9 items-center justify-center rounded-md outline-hidden hover:bg-accent">
          <Bell className="size-5" />
          {sinLeer > 0 && (
            <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-red-500" />
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent side="bottom" align="end" sideOffset={4} className="p-0" style={{ width: 'min(320px, calc(100vw - 2rem))' }}>
          <div className="border-b px-3 py-2">
            <p className="text-sm font-semibold">Notificaciones</p>
          </div>
          {listContent}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

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
        {listContent}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
