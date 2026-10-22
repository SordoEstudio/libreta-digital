import { CheckCircle2, Circle } from 'lucide-react'
import Link from 'next/link'

interface Props {
  slug: string
  tieneAño: boolean
  tieneCursos: boolean
  tieneMaterias: boolean
  tieneAlumnos: boolean
  tieneDocentes: boolean
}

export function OnboardingChecklist({ slug, tieneAño, tieneCursos, tieneMaterias, tieneAlumnos, tieneDocentes }: Props) {
  if (tieneAño && tieneCursos && tieneMaterias && tieneAlumnos && tieneDocentes) return null

  const steps = [
    {
      done: tieneAño,
      label: 'Crear año lectivo activo',
      href: `/dashboard/${slug}/cursos`,
    },
    {
      done: tieneCursos,
      label: 'Agregar al menos un curso',
      href: `/dashboard/${slug}/cursos`,
    },
    {
      done: tieneMaterias,
      label: 'Agregar materias al curso',
      href: `/dashboard/${slug}/cursos`,
    },
    {
      done: tieneAlumnos,
      label: 'Registrar alumnos',
      href: `/dashboard/${slug}/alumnos`,
    },
    {
      done: tieneDocentes,
      label: 'Agregar docentes',
      href: `/dashboard/${slug}/personal`,
    },
  ]

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 px-4 py-4 flex flex-col gap-3">
      <p className="text-sm font-medium">Primeros pasos</p>
      <ul className="flex flex-col gap-2">
        {steps.map(step => (
          <li key={step.href + step.label} className="flex items-center gap-2 text-sm">
            {step.done ? (
              <CheckCircle2 className="size-4 shrink-0 text-green-600" />
            ) : (
              <Circle className="size-4 shrink-0 text-muted-foreground" />
            )}
            {step.done ? (
              <span className="text-muted-foreground line-through">{step.label}</span>
            ) : (
              <Link href={step.href} className="underline underline-offset-4 hover:text-foreground">
                {step.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
