'use client'

import { usePathname } from 'next/navigation'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { NotificationBell } from '@/components/notification-bell'
import type { SessionUser } from '@/lib/auth'

interface MobileHeaderProps {
  session: SessionUser
}

export function MobileHeader({ session: _session }: MobileHeaderProps) {
  const pathname = usePathname()
  const slugMatch = pathname.match(/^\/dashboard\/([^/]+)/)
  const activeSlug = slugMatch?.[1]

  return (
    <header className="md:hidden sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background px-3">
      <SidebarTrigger className="-ml-1 size-9" />
      <span className="flex-1 text-sm font-semibold truncate">Libreta Digital</span>
      {activeSlug && <NotificationBell />}
    </header>
  )
}
