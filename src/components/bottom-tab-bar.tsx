'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSidebar } from '@/components/ui/sidebar'
import {
  LayoutDashboard, GraduationCap, NotebookPen,
  BookOpen, MessageSquare, MoreHorizontal, FileText, FolderOpen, HelpCircle,
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
  let showMas = false

  if (isResponsable && !isAdminLevel && !isDocente) {
    tabs.push(
      {
        href: `/dashboard/${activeSlug}`,
        label: 'Inicio',
        icon: LayoutDashboard,
        match: p => p === `/dashboard/${activeSlug}`,
      },
      {
        href: `/dashboard/${activeSlug}/contenidos`,
        label: 'Contenidos',
        icon: FolderOpen,
        match: p => p.startsWith(`/dashboard/${activeSlug}/contenidos`),
      },
      {
        href: `/dashboard/${activeSlug}/comunicados`,
        label: 'Comunicados',
        icon: MessageSquare,
        match: p => p.startsWith(`/dashboard/${activeSlug}/comunicados`),
      },
      {
        href: `/dashboard/${activeSlug}/mis-alumnos`,
        label: 'Boletines',
        icon: FileText,
        match: p => p.startsWith(`/dashboard/${activeSlug}/mis-alumnos`) || p.startsWith(`/dashboard/${activeSlug}/libreta`),
      },
      {
        href: `/dashboard/${activeSlug}/ayuda`,
        label: 'Ayuda',
        icon: HelpCircle,
        match: p => p.startsWith(`/dashboard/${activeSlug}/ayuda`),
      },
    )
    showMas = false
  } else if (isDocente && !isAdminLevel) {
    tabs.push(
      {
        href: `/dashboard/${activeSlug}`,
        label: 'Inicio',
        icon: LayoutDashboard,
        match: p => p === `/dashboard/${activeSlug}`,
      },
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
        href: `/dashboard/${activeSlug}/comunicados`,
        label: 'Comunicados',
        icon: MessageSquare,
        match: p => p.startsWith(`/dashboard/${activeSlug}/comunicados`),
      },
    )
  } else {
    // Admin / superadmin
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
        href: `/dashboard/${activeSlug}/alumnos`,
        label: 'Alumnos',
        icon: GraduationCap,
        match: p => p.startsWith(`/dashboard/${activeSlug}/alumnos`) || p.startsWith(`/dashboard/${activeSlug}/libreta`),
      },
    )
    showMas = true
  }

  return (
    <nav
      className="md:hidden flex shrink-0 border-t bg-background"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
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
      {showMas && (
        <button
          onClick={toggleSidebar}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <MoreHorizontal className="size-5" />
          Más
        </button>
      )}
    </nav>
  )
}
