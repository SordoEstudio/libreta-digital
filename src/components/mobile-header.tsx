'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { NotificationBell } from '@/components/notification-bell'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { createClient } from '@/lib/supabase/client'
import type { SessionUser } from '@/lib/auth'

interface MobileHeaderProps {
  session: SessionUser
}

export function MobileHeader({ session }: MobileHeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [logo, setLogo] = useState<string | null>(null)
  const [instNombre, setInstNombre] = useState<string | null>(null)

  const slugMatch = pathname.match(/^\/dashboard\/([^/]+)/)
  const activeSlug = slugMatch?.[1]

  useEffect(() => {
    if (!activeSlug) { setLogo(null); setInstNombre(null); return }
    fetch(`/api/v1/instituciones/branding?slug=${activeSlug}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        setLogo(d?.data?.logo_cuadrado_url ?? null)
        setInstNombre(d?.data?.nombre ?? null)
      })
      .catch(() => {})
  }, [activeSlug])

  const initials = (session.nombre ?? session.email)
    .split(' ')
    .map((p: string) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  async function handleLogout() {
    setAvatarOpen(false)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      <header className="md:hidden sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background px-4">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="" className="size-8 rounded-md object-contain shrink-0 bg-white" />
        ) : (
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-harvi-green-lime">
            <span className="text-[10px] font-black text-harvi-dark leading-none">LD</span>
          </div>
        )}

        <span className="flex-1 text-sm font-semibold truncate">
          {instNombre ?? 'Libreta Digital'}
        </span>

        {activeSlug && <NotificationBell compact />}

        <button
          onClick={() => setAvatarOpen(true)}
          className="shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Avatar className="size-8">
            <AvatarFallback className="text-xs bg-harvi-green-lime text-harvi-dark font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </header>

      <Sheet open={avatarOpen} onOpenChange={setAvatarOpen}>
        <SheetContent side="bottom" showCloseButton={false} className="pb-8">
          <SheetHeader className="pb-2">
            <div className="flex items-center gap-3">
              <Avatar className="size-10">
                <AvatarFallback className="bg-harvi-green-lime text-harvi-dark font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <SheetTitle className="truncate text-left">{session.nombre ?? session.email}</SheetTitle>
                <p className="text-xs text-muted-foreground truncate">{session.email}</p>
              </div>
            </div>
          </SheetHeader>
          <div className="flex flex-col gap-1 pt-2">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-destructive hover:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="size-4" />
              Cerrar sesión
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
