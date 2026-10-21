import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { LucideIcon } from 'lucide-react'
import {
  GraduationCap, ArrowRight, MessageSquare,
  CheckCircle2, Clock, AlertCircle, FolderOpen, HelpCircle, FileText,
} from 'lucide-react'
import Link from 'next/link'

interface Props {
  instId: string
  slug: string
  personaId: string
  moduloContenidos?: boolean
  nombre?: string | null
}

export default async function HomeResponsable({ instId, slug, personaId, moduloContenidos, nombre }: Props) {
  const supabase = await createClient()
  const admin = createAdminClient()

  const [confirmacionesRes, vinculacionesRes, añoActivoRes] = await Promise.all([
    admin
      .from('comunicado_confirmaciones')
      .select('id, confirmed_at, comunicados(id, titulo, created_at, deleted_at, cursos(nombre), materias(materias_catalogo(nombre)))')
      .eq('persona_id', personaId)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('alumno_responsables')
      .select('alumno_id, alumnos(id, nombre, apellido)')
      .eq('persona_id', personaId)
      .eq('institucion_id', instId),
    supabase
      .from('años_lectivos')
      .select('id, nombre')
      .eq('institucion_id', instId)
      .eq('activo', true)
      .is('deleted_at', null)
      .maybeSingle(),
  ])

  type ConfirmacionRaw = {
    id: string
    confirmed_at: string | null
    comunicados: {
      id: string
      titulo: string
      created_at: string
      deleted_at: string | null
      cursos: { nombre: string } | null
      materias: { materias_catalogo: { nombre: string } | null } | null
    } | null
  }
  const comunicados = ((confirmacionesRes.data ?? []) as ConfirmacionRaw[])
    .filter(c => c.comunicados && !c.comunicados.deleted_at)
    .map(c => ({
      confId: c.id,
      confirmed: !!c.confirmed_at,
      titulo: c.comunicados!.titulo,
      created_at: c.comunicados!.created_at,
      cursoNombre: (c.comunicados!.cursos as { nombre: string } | null)?.nombre ?? null,
      materiaNombre: (c.comunicados!.materias as { materias_catalogo: { nombre: string } | null } | null)?.materias_catalogo?.nombre ?? null,
    }))

  type AlumnoRaw = { id: string; nombre: string; apellido: string | null }
  const alumnos = (vinculacionesRes.data ?? [])
    .map(v => v.alumnos as AlumnoRaw | null)
    .filter(Boolean) as AlumnoRaw[]

  const añoActivo = añoActivoRes.data

  if (alumnos.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold">Inicio</h1>
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <GraduationCap className="size-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">Aún no tenés alumnos asignados.</p>
        </div>
      </div>
    )
  }

  const alumnoIds = alumnos.map(a => a.id)

  const inscripcionesRes = await supabase
    .from('alumno_inscripciones')
    .select('alumno_id, curso_id, cursos(nombre)')
    .in('alumno_id', alumnoIds)
    .eq('activo', true)
    .is('deleted_at', null)

  type InscripcionRaw = { alumno_id: string; curso_id: string; cursos: { nombre: string } | null }
  const inscripcionPorAlumno = new Map<string, InscripcionRaw>()
  for (const i of (inscripcionesRes.data ?? []) as InscripcionRaw[]) {
    inscripcionPorAlumno.set(i.alumno_id, i)
  }

  const pendientes = comunicados.filter(c => !c.confirmed)
  const primerNombre = nombre?.split(' ')[0] ?? null

  const hoy = new Date().toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  function displayAlumno(a: AlumnoRaw) {
    return a.apellido ? `${a.apellido}, ${a.nombre}` : a.nombre
  }

  function getInitials(a: AlumnoRaw) {
    return (a.nombre[0] + (a.apellido?.[0] ?? '')).toUpperCase()
  }

  const pasos: Array<{
    icon: LucideIcon
    label: string
    desc: string
    href: string
    color: string
    badge?: number
  }> = [
    {
      icon: FileText,
      label: 'Boletín',
      desc: 'Notas y evaluaciones de tu alumno',
      href: alumnos.length === 1
        ? `/dashboard/${slug}/libreta/${alumnos[0].id}`
        : `/dashboard/${slug}/mis-alumnos`,
      color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400',
    },
    {
      icon: MessageSquare,
      label: 'Comunicados',
      desc: pendientes.length > 0 ? `${pendientes.length} sin confirmar` : 'Mensajes de la institución',
      href: `/dashboard/${slug}/comunicados`,
      color: pendientes.length > 0
        ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400'
        : 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400',
      badge: pendientes.length > 0 ? pendientes.length : undefined,
    },
    ...(moduloContenidos ? [{
      icon: FolderOpen,
      label: 'Contenidos',
      desc: 'Materiales compartidos por los docentes',
      href: `/dashboard/${slug}/contenidos`,
      color: 'text-violet-600 bg-violet-50 dark:bg-violet-950/40 dark:text-violet-400',
    }] : []),
    {
      icon: HelpCircle,
      label: 'Ayuda',
      desc: 'Manual de uso paso a paso',
      href: `/dashboard/${slug}/ayuda`,
      color: 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-400',
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Bienvenida */}
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-semibold">
            {primerNombre ? `¡Hola, ${primerNombre}!` : 'Bienvenido/a'}
          </h1>
          {añoActivo && (
            <Badge variant="outline" className="text-xs">{añoActivo.nombre}</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground capitalize">{hoy}</p>
      </div>

      {/* Comunicados pendientes — banner urgente */}
      {pendientes.length > 0 && (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800/50 dark:bg-amber-950/30">
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertCircle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
              {pendientes.length === 1
                ? '1 comunicado sin confirmar'
                : `${pendientes.length} comunicados sin confirmar`}
            </p>
          </div>
          <Button variant="outline" size="sm" className="shrink-0" render={<Link href={`/dashboard/${slug}/comunicados`} />}>
            Ver
            <ArrowRight data-icon="inline-end" />
          </Button>
        </div>
      )}

      {/* Tus alumnos */}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {alumnos.length === 1 ? 'Tu alumno' : 'Tus alumnos'}
        </p>
        {alumnos.map(alumno => {
          const inscripcion = inscripcionPorAlumno.get(alumno.id)
          return (
            <div key={alumno.id} className="flex items-start justify-between gap-4 rounded-xl border p-4">
              {/* Izquierda: avatar arriba, nombre y curso abajo */}
              <div className="flex flex-col gap-2 min-w-0">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm select-none">
                  {getInitials(alumno)}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold leading-tight">{displayAlumno(alumno)}</p>
                  <p className="text-sm text-muted-foreground">{inscripcion?.cursos?.nombre ?? 'Sin curso asignado'}</p>
                </div>
              </div>
              {/* Derecha: botones apilados */}
              <div className="flex flex-col gap-2 shrink-0">
                {moduloContenidos && inscripcion?.curso_id && (
                  <Button variant="outline" size="sm" render={<Link href={`/dashboard/${slug}/contenidos/${inscripcion.curso_id}`} />}>
                    Contenidos
                  </Button>
                )}
                <Button size="sm" render={<Link href={`/dashboard/${slug}/libreta/${alumno.id}`} />}>
                  Ver boletín
                  <ArrowRight data-icon="inline-end" />
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Accesos rápidos */}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Accesos rápidos</p>
        <div className="grid grid-cols-2 gap-3">
          {pasos.map((paso) => {
            const Icon = paso.icon
            return (
              <Link
                key={paso.href}
                href={paso.href}
                className="group flex flex-col gap-3 rounded-xl border p-4 transition-colors hover:bg-muted/40"
              >
                <div className="flex items-center justify-between">
                  <div className={`flex size-9 items-center justify-center rounded-lg ${paso.color}`}>
                    <Icon className="size-5" />
                  </div>
                  {paso.badge ? (
                    <Badge variant="destructive" className="text-xs">{paso.badge}</Badge>
                  ) : (
                    <ArrowRight className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold">{paso.label}</p>
                  <p className="text-xs text-muted-foreground leading-snug">{paso.desc}</p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Comunicados recientes */}
      {comunicados.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="size-4 text-muted-foreground" />
              <h2 className="font-semibold">Comunicados</h2>
              {pendientes.length > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {pendientes.length} pendiente{pendientes.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            <Button variant="ghost" size="sm" render={<Link href={`/dashboard/${slug}/comunicados`} />}>
              Ver todos
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            {comunicados.slice(0, 3).map(c => (
              <div key={c.confId} className="flex items-start justify-between gap-3 rounded-lg border px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-snug">{c.titulo}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {c.cursoNombre}
                    {c.materiaNombre && ` · ${c.materiaNombre}`}
                    {' · '}
                    {new Date(c.created_at).toLocaleDateString('es-AR')}
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  {c.confirmed ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                      <CheckCircle2 className="size-3.5" />
                      Confirmado
                    </span>
                  ) : (
                    <Button variant="outline" size="sm" render={<Link href={`/confirmar/${c.confId}`} />}>
                      <Clock data-icon="inline-start" />
                      Confirmar
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
