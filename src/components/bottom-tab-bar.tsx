'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSidebar } from '@/components/ui/sidebar'
import {
  LayoutDashboard, GraduationCap, NotebookPen,
  BookOpen, CalendarDays, MessageSquare, MoreHorizontal,
} from 'lucide-react'
import { cn } from 'cn'
import type { SessionUser } from '@/lib/auth'

interface BottomTabBarProps {
  session: SessionUser
}

type Tab = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  match: (p: string) => boolean
}

export function BottomTabBar({ session }: BottomTabBarProps) {
  const pathname = usePathname()
  const { toggleSidebar } = useSidebar()

  const slugMatch = pathname.match(/^\/dashboard\/([^/]+)/)
  const activeSlug = slugMatch?.[1]

  if (!activeSlug) return null

  const isSuperadmin = session.memberships.some(m => m.rol === 'superadmin')
  const isAdmin = session.memberships.some(m => m.rol === 'admin')
  const isDocente = session.memberships.some(m => m.rol === 'docente')
  const isResponsable = session.memberships.some(m => m.rol === 'responsable')
  const isAdminLevel = isAdmin || isSuperadmin

  const tabs: Tab[] = []

  if (isResponsable && !isAdminLevel && !isDocente) {
    tabs.push(
      {
        href: `/dashboard/${activeSlug}/mis-alumnos`,
        label: 'Mis alumnos',
        icon: GraduationCap,
        match: p => p.startsWith(`/dashboard/${activeSlug}/mis-alumnos`) || p.startsWith(`/dashboard/${activeSlug}/libreta`),
      },
      {
        href: `/dashboard/${activeSlug}/comunicados`,
        label: 'Comunicados',
        icon: MessageSquare,
        match: p => p.startsWith(`/dashboard/${activeSlug}/comunicados`),
      },
      {
        href: `/dashboard/${activeSlug}/calendario`,
        label: 'Calendario',
        icon: CalendarDays,
        match: p => p.startsWith(`/dashboard/${activeSlug}/calendario`),
      },
    )
  } else if (isDocente && !isAdminLevel) {
    tabs.push(
      {
        href: `/dashboard/${activeSlug}/cuaderno`,
        label: 'Cuaderno',
        icon: NotebookPen,
        match: p => p.startsWith(`/dashboard/${activeSlug}/cuaderno`),
      },
      {
        href: `/dashboard/${activeSlug}/cursos`,
        label: 'Materias',
        icon: BookOpen,
        match: p => p.startsWith(`/dashboard/${activeSlug}/cursos`),
      },
      {
        href: `/dashboard/${activeSlug}/calendario`,
        label: 'Calendario',
        icon: CalendarDays,
        match: p => p.startsWith(`/dashboard/${activeSlug}/calendario`),
      },
    )
  } else {
    tabs.push(
      {
        href: `/dashboard/${activeSlug}`,
        label: 'Inicio',
        icon: LayoutDashboard,
        match: p => p === `/dashboard/${activeSlug}`,
      },
      {
        href: `/dashboard/${activeSlug}/comunicados`,
        label: 'Comunicados',
        icon: MessageSquare,
        match: p => p.startsWith(`/dashboard/${activeSlug}/comunicados`),
      },
      {
        href: `/dashboard/${activeSlug}/calendario`,
        label: 'Calendario',
        icon: CalendarDays,
        match: p => p.startsWith(`/dashboard/${activeSlug}/calendario`),
      },
    )
  }

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 flex border-t bg-background">
      {tabs.map(tab => {
        const active = tab.match(pathname)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors',
              active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <tab.icon className="size-5" />
            {tab.label}
          </Link>
        )
      })}
      <button
        onClick={toggleSidebar}
        className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <MoreHorizontal className="size-5" />
        Más
      </button>
    </nav>
  )
}
