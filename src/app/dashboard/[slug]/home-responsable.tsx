import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { GraduationCap, BookOpen, BookMarked, ArrowRight, MessageSquare, CheckCircle2, Clock } from 'lucide-react'
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

  // Comunicados del responsable (vía confirmaciones)
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
  const { data: confirmacionesRaw } = await admin
    .from('comunicado_confirmaciones')
    .select('id, confirmed_at, comunicados(id, titulo, created_at, deleted_at, cursos(nombre), materias(materias_catalogo(nombre)))')
    .eq('persona_id', personaId)
    .order('created_at', { ascending: false })
    .limit(20)

  const comunicados = ((confirmacionesRaw ?? []) as ConfirmacionRaw[])
    .filter(c => c.comunicados && !c.comunicados.deleted_at)
    .map(c => ({
      confId: c.id,
      confirmed: !!c.confirmed_at,
      titulo: c.comunicados!.titulo,
      created_at: c.comunicados!.created_at,
      cursoNombre: (c.comunicados!.cursos as { nombre: string } | null)?.nombre ?? null,
      materiaNombre: (c.comunicados!.materias as { materias_catalogo: { nombre: string } | null } | null)?.materias_catalogo?.nombre ?? null,
    }))

  const [vinculacionesRes, añoActivoRes] = await Promise.all([
    supabase
      .from('alumno_responsables')
      .select('alumno_id, alumnos(id, nombre)')
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

  type AlumnoRaw = { id: string; nombre: string }
  const alumnos = (vinculacionesRes.data ?? [])
    .map(v => v.alumnos as AlumnoRaw | null)
    .filter(Boolean) as AlumnoRaw[]

  const añoActivo = añoActivoRes.data

  if (alumnos.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold">Mis alumnos</h1>
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <GraduationCap className="size-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">Aún no tenés alumnos asignados.</p>
        </div>
      </div>
    )
  }

  const alumnoIds = alumnos.map(a => a.id)

  // Get inscripciones activas
  const { data: inscripciones } = await supabase
    .from('alumno_inscripciones')
    .select('alumno_id, curso_id, cursos(nombre)')
    .in('alumno_id', alumnoIds)
    .eq('activo', true)
    .is('deleted_at', null)

  type InscripcionRaw = { alumno_id: string; curso_id: string; cursos: { nombre: string } | null }
  const inscripcionPorAlumno = new Map<string, InscripcionRaw>()
  for (const i of (inscripciones ?? []) as InscripcionRaw[]) {
    inscripcionPorAlumno.set(i.alumno_id, i)
  }

  // Get evaluaciones del año activo para obtener notas filtradas por año
  let evalIdsDelAño: string[] = []
  if (añoActivo) {
    const { data: cursosDelAño } = await supabase
      .from('cursos')
      .select('id')
      .eq('año_lectivo_id', añoActivo.id)
      .is('deleted_at', null)

    const cursoAñoIds = (cursosDelAño ?? []).map(c => c.id)

    if (cursoAñoIds.length > 0) {
      const { data: materiasDelAño } = await supabase
        .from('materias')
        .select('id')
        .in('curso_id', cursoAñoIds)
        .eq('institucion_id', instId)
        .is('deleted_at', null)

      const materiaAñoIds = (materiasDelAño ?? []).map(m => m.id)

      if (materiaAñoIds.length > 0) {
        const { data: evalsDelAño } = await supabase
          .from('evaluaciones')
          .select('id')
          .in('materia_id', materiaAñoIds)
          .is('deleted_at', null)

        evalIdsDelAño = (evalsDelAño ?? []).map(e => e.id)
      }
    }
  }

  // Get notas for these alumnos filtered to active year
  const { data: notas } = alumnoIds.length > 0 && evalIdsDelAño.length > 0
    ? await admin
        .from('notas')
        .select('id, valor_numerico, valor_literal, alumno_id, evaluaciones(id, nombre, materias(id, materias_catalogo(nombre)))')
        .in('alumno_id', alumnoIds)
        .in('evaluacion_id', evalIdsDelAño)
        .is('deleted_at', null)
    : { data: [] }

  type EvalNota = { id: string; nombre: string; materias: { id: string; materias_catalogo: { nombre: string } | null } | null }
  type NotaRaw = { id: string; valor_numerico: number | null; valor_literal: string | null; alumno_id: string; evaluaciones: EvalNota | null }

  const notasPorAlumno = new Map<string, NotaRaw[]>()
  for (const n of (notas ?? []) as NotaRaw[]) {
    const arr = notasPorAlumno.get(n.alumno_id) ?? []
    arr.push(n)
    notasPorAlumno.set(n.alumno_id, arr)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Mis alumnos</h1>
        {añoActivo && (
          <span className="text-sm text-muted-foreground">{añoActivo.nombre}</span>
        )}
      </div>

      {comunicados.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="size-4 text-muted-foreground" />
            <h2 className="font-semibold">Comunicados</h2>
            {comunicados.filter(c => !c.confirmed).length > 0 && (
              <Badge variant="destructive" className="text-xs">
                {comunicados.filter(c => !c.confirmed).length} sin confirmar
              </Badge>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {comunicados.map(c => (
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
                    <Button
                      variant="outline"
                      size="sm"
                      render={<Link href={`/confirmar/${c.confId}`} />}
                    >
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

      {alumnos.map(alumno => {
        const inscripcion = inscripcionPorAlumno.get(alumno.id)
        const alumnoNotas = notasPorAlumno.get(alumno.id) ?? []

        // Group notas by materia
        const notasPorMateria = new Map<string, { nombre: string; notas: NotaRaw[] }>()
        for (const n of alumnoNotas) {
          const materia = n.evaluaciones?.materias
          if (!materia) continue
          const materiaId = materia.id
          const materiaNombre = materia.materias_catalogo?.nombre ?? '—'
          if (!notasPorMateria.has(materiaId)) {
            notasPorMateria.set(materiaId, { nombre: materiaNombre, notas: [] })
          }
          notasPorMateria.get(materiaId)!.notas.push(n)
        }

        return (
          <div key={alumno.id} className="flex flex-col gap-3 rounded-lg border p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">{alumno.nombre}</p>
                <p className="text-sm text-muted-foreground">
                  {inscripcion?.cursos?.nombre ?? 'Sin curso asignado'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="secondary" size="sm" render={<Link href={`/dashboard/${slug}/libreta/${alumno.id}`} />}>
                  Ver libreta
                  <ArrowRight data-icon="inline-end" />
                </Button>
                {moduloContenidos && inscripcion?.curso_id && (
                  <Button variant="outline" size="sm" render={<Link href={`/dashboard/${slug}/contenidos/${inscripcion.curso_id}`} />}>
                    <BookMarked data-icon="inline-start" />
                    Contenidos
                  </Button>
                )}
              </div>
            </div>

            {notasPorMateria.size === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BookOpen className="size-4 shrink-0" />
                <span>{añoActivo ? 'Sin notas cargadas este año.' : 'Sin año lectivo activo.'}</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {[...notasPorMateria.entries()].map(([materiaId, { nombre, notas: mNotas }]) => (
                  <div key={materiaId}>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{nombre}</p>
                    <div className="flex flex-col gap-0.5">
                      {mNotas.map(n => (
                        <div key={n.id} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{n.evaluaciones?.nombre}</span>
                          <span className="font-medium tabular-nums">
                            {n.valor_numerico != null ? n.valor_numerico : n.valor_literal ?? '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
