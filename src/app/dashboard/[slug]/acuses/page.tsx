import { requireSession, isSuperadmin, hasRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import { CheckCircle2, XCircle } from 'lucide-react'
import PeriodoSelectNav from './periodo-select-nav'
import ConfirmarManualButton from './confirmar-manual-button'

type PageProps = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ periodo_id?: string }>
}

export default async function AcusesPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { periodo_id: selectedPeriodoId } = await searchParams

  const session = await requireSession()

  const supabase = await createClient()
  const { data: inst } = await supabase
    .from('instituciones')
    .select('id')
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

  // Active year
  const { data: añoActivo } = await admin
    .from('años_lectivos')
    .select('id, nombre')
    .eq('institucion_id', inst.id)
    .eq('activo', true)
    .is('deleted_at', null)
    .maybeSingle()

  // Closed periods for active year
  const { data: periodos } = añoActivo
    ? await admin
        .from('periodos')
        .select('id, nombre, orden')
        .eq('año_lectivo_id', añoActivo.id)
        .not('cerrado_at', 'is', null)
        .is('deleted_at', null)
        .order('orden')
    : { data: null }

  const periodosList = periodos ?? []

  const activePeriodo = selectedPeriodoId
    ? periodosList.find(p => p.id === selectedPeriodoId)
    : periodosList[periodosList.length - 1]

  if (periodosList.length === 0 || !activePeriodo) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-semibold md:text-2xl">Acuses de boletín</h1>
        <p className="text-sm text-muted-foreground">No hay períodos cerrados para mostrar.</p>
      </div>
    )
  }

  // Courses for active year
  const { data: cursos } = await admin
    .from('cursos')
    .select('id, nombre')
    .eq('año_lectivo_id', añoActivo!.id)
    .is('deleted_at', null)

  const cursoIds = (cursos ?? []).map(c => c.id)

  // Alumnos with active inscriptions
  const { data: inscripciones } = cursoIds.length > 0
    ? await admin
        .from('alumno_inscripciones')
        .select('alumno_id, curso_id, alumnos(nombre, apellido)')
        .in('curso_id', cursoIds)
        .eq('activo', true)
        .is('deleted_at', null)
    : { data: null }

  type InscRow = { alumno_id: string; curso_id: string; alumnos: { nombre: string; apellido: string | null } | null }
  const inscRows = (inscripciones ?? []) as InscRow[]

  const alumnoIds = [...new Set(inscRows.map(i => i.alumno_id))]
  const cursoByAlumno = new Map(inscRows.map(i => [i.alumno_id, i.curso_id]))
  const cursoNombreMap = new Map((cursos ?? []).map(c => [c.id, c.nombre]))

  // Responsables per alumno
  const { data: responsablesData } = alumnoIds.length > 0
    ? await admin
        .from('alumno_responsables')
        .select('alumno_id, persona_id, personas(nombre)')
        .in('alumno_id', alumnoIds)
        .eq('institucion_id', inst.id)
    : { data: null }

  type RespRow = { alumno_id: string; persona_id: string; personas: { nombre: string } | null }
  const respRows = (responsablesData ?? []) as RespRow[]

  const respByAlumno = new Map<string, Array<{ persona_id: string; nombre: string }>>()
  for (const r of respRows) {
    if (!respByAlumno.has(r.alumno_id)) respByAlumno.set(r.alumno_id, [])
    respByAlumno.get(r.alumno_id)!.push({
      persona_id: r.persona_id,
      nombre: (r.personas as { nombre: string } | null)?.nombre ?? '—',
    })
  }

  // Acuses for selected period
  const { data: acusesData } = alumnoIds.length > 0
    ? await admin
        .from('boletin_acuses')
        .select('alumno_id, persona_id, confirmed_at, confirmado_por, personas!boletin_acuses_confirmado_por_fkey(nombre)')
        .eq('periodo_id', activePeriodo.id)
        .in('alumno_id', alumnoIds)
    : { data: null }

  type AcuseRow = { alumno_id: string; persona_id: string; confirmed_at: string; confirmado_por: string | null; personas: { nombre: string } | null }
  const acuseRows = (acusesData ?? []) as AcuseRow[]
  const acuseMap = new Map(
    acuseRows.map(a => [`${a.alumno_id}:${a.persona_id}`, {
      confirmed_at: a.confirmed_at,
      confirmado_por_nombre: (a.personas as { nombre: string } | null)?.nombre ?? null,
    }])
  )

  type TableRow = {
    alumnoId: string
    nombre: string
    curso: string
    responsables: Array<{ persona_id: string; nombre: string; confirmed_at: string | null; confirmado_por_nombre: string | null }>
    total: number
    confirmed: number
  }

  const tableRows: TableRow[] = inscRows
    .map(i => {
      if (!i.alumnos) return null
      const resps = respByAlumno.get(i.alumno_id) ?? []
      const enriched = resps.map(r => {
        const acuse = acuseMap.get(`${i.alumno_id}:${r.persona_id}`)
        return {
          ...r,
          confirmed_at: acuse?.confirmed_at ?? null,
          confirmado_por_nombre: acuse?.confirmado_por_nombre ?? null,
        }
      })
      return {
        alumnoId: i.alumno_id,
        nombre: i.alumnos.apellido
          ? `${i.alumnos.apellido}, ${i.alumnos.nombre}`
          : i.alumnos.nombre,
        curso: cursoNombreMap.get(cursoByAlumno.get(i.alumno_id) ?? '') ?? '—',
        responsables: enriched,
        total: resps.length,
        confirmed: enriched.filter(r => r.confirmed_at !== null).length,
      }
    })
    .filter((r): r is TableRow => r !== null)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

  const totalConfirmados = tableRows.filter(r => r.total > 0 && r.confirmed === r.total).length

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold md:text-2xl">Acuses de boletín</h1>
          <p className="text-sm text-muted-foreground">
            {añoActivo?.nombre} · {totalConfirmados}/{tableRows.filter(r => r.total > 0).length} familias confirmaron
          </p>
        </div>
        <PeriodoSelectNav periodos={periodosList} activePeriodoId={activePeriodo.id} slug={slug} />
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Alumno</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide hidden sm:table-cell">Curso</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Responsables</th>
              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Estado</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map(row => (
              <tr key={row.alumnoId} className="border-b last:border-0">
                <td className="px-4 py-3 font-medium align-top">{row.nombre}</td>
                <td className="px-4 py-3 text-muted-foreground align-top hidden sm:table-cell">{row.curso}</td>
                <td className="px-4 py-3 align-top">
                  {row.responsables.length === 0 ? (
                    <span className="text-muted-foreground text-xs">Sin responsables</span>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {row.responsables.map(r => (
                        <div key={r.persona_id} className="group flex items-center gap-2">
                          {r.confirmed_at ? (
                            <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                          ) : (
                            <XCircle className="size-3.5 text-muted-foreground/30 shrink-0" />
                          )}
                          <span className="text-sm">{r.nombre}</span>
                          {r.confirmed_at && (
                            <span className="text-xs text-muted-foreground">
                              {new Date(r.confirmed_at).toLocaleDateString('es-AR')}
                              {r.confirmado_por_nombre && ` · por ${r.confirmado_por_nombre}`}
                            </span>
                          )}
                          <ConfirmarManualButton
                            alumnoId={row.alumnoId}
                            personaId={r.persona_id}
                            periodoId={activePeriodo.id}
                            instId={inst.id}
                            confirmed={!!r.confirmed_at}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-right align-top">
                  <span className={`text-sm font-medium ${
                    row.total === 0 ? 'text-muted-foreground' :
                    row.confirmed === row.total ? 'text-emerald-600' :
                    row.confirmed === 0 ? 'text-destructive' :
                    'text-amber-600'
                  }`}>
                    {row.total === 0 ? '—' : `${row.confirmed}/${row.total}`}
                  </span>
                </td>
              </tr>
            ))}
            {tableRows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No hay alumnos inscriptos para este período.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
