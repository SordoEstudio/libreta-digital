import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Button } from '@/components/ui/button'
import { GraduationCap, BookOpen, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface Props {
  instId: string
  slug: string
  personaId: string
}

export default async function HomeResponsable({ instId, slug, personaId }: Props) {
  const supabase = await createClient()
  const admin = createAdminClient()

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
              <Button variant="secondary" size="sm" className="shrink-0" render={<Link href={`/dashboard/${slug}/libreta/${alumno.id}`} />}>
                Ver libreta
                <ArrowRight data-icon="inline-end" />
              </Button>
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
