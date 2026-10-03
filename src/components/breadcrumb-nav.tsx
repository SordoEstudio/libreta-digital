'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'

const LABELS: Record<string, string> = {
  instituciones: 'Instituciones',
  stats: 'Estadísticas',
  alumnos: 'Alumnos',
  cursos: 'Cursos',
  materias: 'Materias',
  configuracion: 'Configuración',
  periodos: 'Períodos',
  usuarios: 'Usuarios',
  libreta: 'Libretas',
  'mis-alumnos': 'Mis alumnos',
  evaluaciones: 'Evaluaciones',
  notas: 'Notas',
  nueva: 'Nueva institución',
}

const STATIC_ROOTS = new Set(['instituciones', 'stats'])
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function BreadcrumbNav() {
  const pathname = usePathname()
  const after = pathname.replace(/^\/dashboard\/?/, '')
  if (!after) return null

  const segments = after.split('/').filter(Boolean)
  const crumbs: { label: string; href: string }[] = []

  segments.forEach((seg, i) => {
    if (UUID_RE.test(seg)) return
    if (i === 0 && !STATIC_ROOTS.has(seg)) return // slug institución
    const label = LABELS[seg]
    if (!label) return
    crumbs.push({ label, href: '/dashboard/' + segments.slice(0, i + 1).join('/') })
  })

  if (crumbs.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
      {crumbs.map((crumb, i) => (
        <span key={crumb.href} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />}
          {i === crumbs.length - 1 ? (
            <span className="font-medium text-foreground">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="text-muted-foreground hover:text-foreground transition-colors">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  )
}
