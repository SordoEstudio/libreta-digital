import { requireSession, isSuperadmin, hasRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { cn } from 'cn'
import { AcusesTable } from './acuses-table'
import type { AlumnoAcuse } from './acuses-table'

type PageProps = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ año?: string; periodo?: string }>
}

type AñoItem = { id: string; nombre: string; activo: boolean }
type PeriodoItem = { id: string; nombre: string; orden: number; publicado_at: string | null }

export default async function AcusesPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { año: añoParam, periodo: periodoParam } = await searchParams

  const session = await requireSession()

  const supabase = await createClient()
  const { data: inst } = await supabase
    .from('instituciones')
    .select('id, nombre')
    .eq('slug', slug)
    .is('deleted_at', null)
    .single()

  if (!inst) {
    if (isSuperadmin(session)) redirect('/dashboard/instituciones')
    notFound()
  }
  if (!isSuperadmin(session) && !hasRole(session, inst.id, 'admin'))
    redirect(`/dashboard/${slug}`)

  const admin = createAdminClient()

  // Fetch años lectivos
  const { data: añosRaw } = await admin
    .from('años_lectivos')
    .select('*')
    .eq('institucion_id', inst.id)
    .is('deleted_at', null)
    .order('nombre', { ascending: false })

  const añosList = (añosRaw ?? []) as AñoItem[]

  if (añosList.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold md:text-2xl">Acuses de boletín</h1>
          <p className="text-sm text-muted-foreground">{inst.nombre}</p>
        </div>
        <p className="text-sm text-muted-foreground">No hay años lectivos configurados.</p>
      </div>
    )
  }

  // Select active año, fallback to first
  const selectedAño =
    (añoParam ? añosList.find(a => a.id === añoParam) : null) ??
    añosList.find(a => a.activo) ??
    añosList[0]

  // Fetch periods for selected año
  const { data: periodosRaw } = await admin
    .from('periodos')
    .select('id, nombre, orden, publicado_at')
    .eq('año_lectivo_id', selectedAño.id)
    .order('orden')

  const todosPeriodos = (periodosRaw ?? []) as PeriodoItem[]
  const periodos = todosPeriodos.filter(p => p.publicado_at !== null)

  if (todosPeriodos.length === 0) {
    return (
      <AcusesLayout
        slug={slug}
        inst={inst}
        añosList={añosList}
        selectedAño={selectedAño}
        allPeriodos={[]}
        selectedPeriodo={null}
      >
        <p className="text-sm text-muted-foreground">Este año no tiene períodos.</p>
      </AcusesLayout>
    )
  }

  // Select período (from searchParams, fallback to first published)
  const selectedPeriodo =
    (periodoParam ? todosPeriodos.find(p => p.id === periodoParam) : null) ??
    periodos[0] ??
    null

  if (!selectedPeriodo) {
    return (
      <AcusesLayout
        slug={slug}
        inst={inst}
        añosList={añosList}
        selectedAño={selectedAño}
        allPeriodos={todosPeriodos}
        selectedPeriodo={null}
      >
        <p className="text-sm text-muted-foreground">Este año aún no tiene períodos publicados.</p>
      </AcusesLayout>
    )
  }

  // Check if selected período is published
  if (!selectedPeriodo.publicado_at) {
    return (
      <AcusesLayout
        slug={slug}
        inst={inst}
        añosList={añosList}
        selectedAño={selectedAño}
        allPeriodos={todosPeriodos}
        selectedPeriodo={selectedPeriodo}
      >
        <p className="text-sm text-muted-foreground">Este período aún no fue publicado.</p>
      </AcusesLayout>
    )
  }

  // ── Fetch acuses data ────────────────────────────────────────────────────

  const { data: cursos } = await admin
    .from('cursos')
    .select('id, nombre')
    .eq('año_lectivo_id', selectedAño.id)
    .is('deleted_at', null)

  const cursoMap = new Map((cursos ?? []).map(c => [c.id, c.nombre as string]))

  type InscItem = { curso_id: string; activo: boolean; deleted_at: string | null }

  const { data: alumnos } = await admin
    .from('alumnos')
    .select('id, nombre, apellido, alumno_inscripciones(curso_id, activo, deleted_at)')
    .eq('institucion_id', inst.id)
    .eq('activo', true)
    .is('deleted_at', null)

  const alumnosFiltrados = (alumnos ?? []).filter(a =>
    ((a.alumno_inscripciones ?? []) as InscItem[]).some(
      i => i.activo && !i.deleted_at && cursoMap.has(i.curso_id)
    )
  )
  const alumnoIds = alumnosFiltrados.map(a => a.id)

  type AlumnoInfo = { nombre: string; apellido: string | null; curso_nombre: string | null }
  const alumnoInfoMap = new Map<string, AlumnoInfo>()
  for (const a of alumnosFiltrados) {
    const insc = ((a.alumno_inscripciones ?? []) as InscItem[]).find(
      i => i.activo && !i.deleted_at && cursoMap.has(i.curso_id)
    )
    alumnoInfoMap.set(a.id, {
      nombre: a.nombre,
      apellido: (a as { apellido?: string | null }).apellido ?? null,
      curso_nombre: insc ? (cursoMap.get(insc.curso_id) ?? null) : null,
    })
  }

  let tableRows: AlumnoAcuse[] = []

  if (alumnoIds.length === 0) {
    return (
      <AcusesLayout
        slug={slug}
        inst={inst}
        añosList={añosList}
        selectedAño={selectedAño}
        allPeriodos={todosPeriodos}
        selectedPeriodo={selectedPeriodo}
      >
        <p className="text-sm text-muted-foreground">No hay alumnos inscriptos en este período.</p>
      </AcusesLayout>
    )
  }

  const { data: responsables } = await admin
    .from('alumno_responsables')
    .select('alumno_id, persona_id')
    .in('alumno_id', alumnoIds)

  const personaIds = [...new Set((responsables ?? []).map(r => r.persona_id))]

  if (personaIds.length > 0) {
    const { data: personas } = await admin
      .from('personas')
      .select('id, nombre, apellido')
      .in('id', personaIds)

    type PersonaRow = { id: string; nombre: string; apellido: string | null }
    const personaMap = new Map((personas ?? []).map(p => [p.id, p as PersonaRow]))

    const { data: acuses } = await admin
      .from('boletin_acuses')
      .select('alumno_id, persona_id, confirmed_at')
      .eq('periodo_id', selectedPeriodo.id)

    const acuseMap = new Map(
      (acuses ?? []).map(a => [`${a.alumno_id}:${a.persona_id}`, a.confirmed_at as string | null])
    )

    const alumnoMap = new Map<string, AlumnoAcuse>()

    for (const ar of responsables ?? []) {
      const persona = personaMap.get(ar.persona_id)
      if (!persona) continue
      const info = alumnoInfoMap.get(ar.alumno_id)
      if (!info) continue

      if (!alumnoMap.has(ar.alumno_id)) {
        alumnoMap.set(ar.alumno_id, {
          alumno_id: ar.alumno_id,
          alumno_nombre: info.nombre,
          alumno_apellido: info.apellido,
          curso_nombre: info.curso_nombre,
          responsables: [],
          confirmed_count: 0,
          total_count: 0,
          last_confirmed_at: null,
        })
      }

      const entry = alumnoMap.get(ar.alumno_id)!
      const confirmed_at = acuseMap.get(`${ar.alumno_id}:${ar.persona_id}`) ?? null

      entry.total_count++
      entry.responsables.push({
        persona_id: ar.persona_id,
        nombre: persona.nombre,
        apellido: persona.apellido,
        confirmed_at,
      })
      if (confirmed_at) {
        entry.confirmed_count++
        if (!entry.last_confirmed_at || confirmed_at > entry.last_confirmed_at) {
          entry.last_confirmed_at = confirmed_at
        }
      }
    }

    // Include alumnos with no responsables
    for (const [alumnoId, info] of alumnoInfoMap) {
      if (!alumnoMap.has(alumnoId)) {
        alumnoMap.set(alumnoId, {
          alumno_id: alumnoId,
          alumno_nombre: info.nombre,
          alumno_apellido: info.apellido,
          curso_nombre: info.curso_nombre,
          responsables: [],
          confirmed_count: 0,
          total_count: 0,
          last_confirmed_at: null,
        })
      }
    }

    tableRows = [...alumnoMap.values()].sort((a, b) =>
      (a.alumno_apellido ?? a.alumno_nombre).localeCompare(
        b.alumno_apellido ?? b.alumno_nombre,
        'es'
      )
    )
  } else {
    // No responsables — include alumnos with empty lists
    tableRows = alumnosFiltrados
      .map(a => {
        const info = alumnoInfoMap.get(a.id)!
        return {
          alumno_id: a.id,
          alumno_nombre: info.nombre,
          alumno_apellido: info.apellido,
          curso_nombre: info.curso_nombre,
          responsables: [],
          confirmed_count: 0,
          total_count: 0,
          last_confirmed_at: null,
        }
      })
      .sort((a, b) =>
        (a.alumno_apellido ?? a.alumno_nombre).localeCompare(
          b.alumno_apellido ?? b.alumno_nombre,
          'es'
        )
      )
  }

  return (
    <AcusesLayout
      slug={slug}
      inst={inst}
      añosList={añosList}
      selectedAño={selectedAño}
      allPeriodos={todosPeriodos}
      selectedPeriodo={selectedPeriodo}
    >
      <AcusesTable rows={tableRows} periodoNombre={selectedPeriodo.nombre} />
    </AcusesLayout>
  )
}

// ── Layout helper ─────────────────────────────────────────────────────────────

function AcusesLayout({
  slug,
  inst,
  añosList,
  selectedAño,
  allPeriodos,
  selectedPeriodo,
  children,
}: {
  slug: string
  inst: { id: string; nombre: string }
  añosList: AñoItem[]
  selectedAño: AñoItem
  allPeriodos: PeriodoItem[]
  selectedPeriodo: PeriodoItem | null
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold md:text-2xl">Acuses de boletín</h1>
        <p className="text-sm text-muted-foreground">{inst.nombre}</p>
      </div>

      {/* Año selector */}
      <div className="flex flex-wrap gap-2">
        {añosList.map(año => (
          <Link
            key={año.id}
            href={`/dashboard/${slug}/acuses?año=${año.id}`}
            className={cn(
              'inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium transition-colors',
              año.id === selectedAño.id
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border bg-background text-foreground hover:bg-muted'
            )}
          >
            {año.nombre}
          </Link>
        ))}
      </div>

      {/* Período selector */}
      {allPeriodos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {allPeriodos.map(p => (
            <Link
              key={p.id}
              href={`/dashboard/${slug}/acuses?año=${selectedAño.id}&periodo=${p.id}`}
              className={cn(
                'inline-flex items-center rounded-full border px-3 py-1 text-sm transition-colors',
                p.id === selectedPeriodo?.id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : p.publicado_at
                  ? 'border-border bg-background text-foreground hover:bg-muted'
                  : 'border-border bg-background text-muted-foreground opacity-60 pointer-events-none'
              )}
            >
              {p.nombre}
            </Link>
          ))}
        </div>
      )}

      {children}
    </div>
  )
}
