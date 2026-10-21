import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  GraduationCap, BookMarked, ArrowRight, MessageSquare,
  CheckCircle2, Clock, AlertCircle,
} from 'lucide-react'
import Link from 'next/link'

interface Props {
  instId: string
  slug: string
  personaId: string
  moduloContenidos?: boolean
}

export default async function HomeResponsable({ instId, slug, personaId, moduloContenidos }: Props) {
  const supabase = await createClient()
  const admin = createAdminClient()

  // All in parallel
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

  // Inscripciones + últimas notas en paralelo
  const [inscripcionesRes, ultimasNotasRes] = await Promise.all([
    supabase
      .from('alumno_inscripciones')
      .select('alumno_id, curso_id, cursos(nombre)')
      .in('alumno_id', alumnoIds)
      .eq('activo', true)
      .is('deleted_at', null),
    admin
      .from('notas')
      .select('alumno_id, valor_numerico, valor_literal, created_at, evaluaciones(nombre, materias(materias_catalogo(nombre)))')
      .in('alumno_id', alumnoIds)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(15),
  ])

  type InscripcionRaw = { alumno_id: string; curso_id: string; cursos: { nombre: string } | null }
  const inscripcionPorAlumno = new Map<string, InscripcionRaw>()
  for (const i of (inscripcionesRes.data ?? []) as InscripcionRaw[]) {
    inscripcionPorAlumno.set(i.alumno_id, i)
  }

  type EvalNota = { nombre: string; materias: { materias_catalogo: { nombre: string } | null } | null }
  type NotaRaw = { alumno_id: string; valor_numerico: number | null; valor_literal: string | null; created_at: string; evaluaciones: EvalNota | null }
  const ultimasNotas = (ultimasNotasRes.data ?? []) as NotaRaw[]

  const pendientes = comunicados.filter(c => !c.confirmed)

  function displayAlumno(a: AlumnoRaw) {
    return a.apellido ? `${a.apellido}, ${a.nombre}` : a.nombre
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Inicio</h1>
        {añoActivo && (
          <span className="text-sm text-muted-foreground">{añoActivo.nombre}</span>
        )}
      </div>

      {/* Comunicados pendientes — banner */}
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

      {/* Cards por alumno */}
      <div className="flex flex-col gap-3">
        {alumnos.map(alumno => {
          const inscripcion = inscripcionPorAlumno.get(alumno.id)
          const alumnoNotas = ultimasNotas.filter(n => n.alumno_id === alumno.id).slice(0, 3)

          return (
            <div key={alumno.id} className="flex flex-col gap-3 rounded-lg border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{displayAlumno(alumno)}</p>
                  <p className="text-sm text-muted-foreground">
                    {inscripcion?.cursos?.nombre ?? 'Sin curso asignado'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                  {moduloContenidos && inscripcion?.curso_id && (
                    <Button variant="outline" size="sm" render={<Link href={`/dashboard/${slug}/contenidos/${inscripcion.curso_id}`} />}>
                      <BookMarked data-icon="inline-start" />
                      Contenidos
                    </Button>
                  )}
                  <Button variant="secondary" size="sm" render={<Link href={`/dashboard/${slug}/libreta/${alumno.id}`} />}>
                    Ver libreta
                    <ArrowRight data-icon="inline-end" />
                  </Button>
                </div>
              </div>

              {alumnoNotas.length > 0 ? (
                <div className="flex flex-col gap-0.5 rounded-md bg-muted/40 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Últimas notas</p>
                  {alumnoNotas.map((n, i) => {
                    const evalNombre = n.evaluaciones?.nombre ?? '—'
                    const materiaNombre = (n.evaluaciones?.materias as { materias_catalogo: { nombre: string } | null } | null)?.materias_catalogo?.nombre ?? '—'
                    const valor = n.valor_numerico != null ? n.valor_numerico : (n.valor_literal ?? '—')
                    return (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground truncate">{materiaNombre} · {evalNombre}</span>
                        <span className="font-semibold tabular-nums ml-3 shrink-0">{valor}</span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sin notas recientes.</p>
              )}
            </div>
          )
        })}
      </div>

      {/* Comunicados recientes */}
      {comunicados.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="size-4 text-muted-foreground" />
              <h2 className="font-semibold">Comunicados</h2>
              {pendientes.length > 0 && (
                <Badge variant="destructive" className="text-xs">{pendientes.length} pendiente{pendientes.length !== 1 ? 's' : ''}</Badge>
              )}
            </div>
            <Button variant="ghost" size="sm" render={<Link href={`/dashboard/${slug}/comunicados`} />}>
              Ver todos
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            {comunicados.slice(0, 5).map(c => (
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
