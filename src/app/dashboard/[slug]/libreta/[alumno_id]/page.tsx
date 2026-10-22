import { requireSession, isSuperadmin, hasAnyRole, hasRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'

type Params = { params: Promise<{ slug: string; alumno_id: string }> }

export default async function LibretaPage({ params }: Params) {
  const { slug, alumno_id } = await params
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

  if (!isSuperadmin(session) && !hasAnyRole(session, inst.id, ['admin', 'docente', 'responsable', 'alumno']))
    redirect('/dashboard')

  // Alumno gate: can only view their own libreta
  if (!isSuperadmin(session) && hasRole(session, inst.id, 'alumno') &&
      !hasAnyRole(session, inst.id, ['admin', 'docente', 'responsable'])) {
    const { data: propioAlumno } = await supabase
      .from('alumnos')
      .select('id')
      .eq('id', alumno_id)
      .eq('persona_id', session.persona_id ?? '')
      .maybeSingle()
    if (!propioAlumno) redirect(`/dashboard/${slug}`)
    redirect(`/dashboard/${slug}/libreta/${alumno_id}/boletin`)
  }

  const isResponsableOnly =
    !isSuperadmin(session) &&
    !hasRole(session, inst.id, 'admin') &&
    !hasRole(session, inst.id, 'docente') &&
    hasRole(session, inst.id, 'responsable')

  // Non-responsables go straight to the boletín
  if (!isResponsableOnly || !session.persona_id) {
    redirect(`/dashboard/${slug}/libreta/${alumno_id}/boletin`)
  }

  // Responsable gate: find closed periods and check confirmation status
  const { data: inscripcion } = await supabase
    .from('alumno_inscripciones')
    .select('curso_id')
    .eq('alumno_id', alumno_id)
    .eq('activo', true)
    .is('deleted_at', null)
    .maybeSingle()

  const cursoId = inscripcion?.curso_id
  let añoLectivoId: string | undefined
  if (cursoId) {
    const { data: curso } = await supabase.from('cursos').select('*').eq('id', cursoId).single()
    añoLectivoId = curso?.año_lectivo_id ?? undefined
  }

  if (!añoLectivoId) {
    redirect(`/dashboard/${slug}/libreta/${alumno_id}/boletin`)
  }

  // Periodos RLS allows responsables to read — user client is fine
  const { data: closedPeriods } = await supabase
    .from('periodos')
    .select('id')
    .eq('año_lectivo_id', añoLectivoId)
    .not('cerrado_at', 'is', null)
    .is('deleted_at', null)

  const closedIds = (closedPeriods ?? []).map(p => p.id)

  if (closedIds.length === 0) {
    redirect(`/dashboard/${slug}/libreta/${alumno_id}/boletin`)
  }

  const { data: existingAcuses } = await supabase
    .from('boletin_acuses')
    .select('periodo_id')
    .eq('alumno_id', alumno_id)
    .eq('persona_id', session.persona_id)
    .in('periodo_id', closedIds)

  const confirmedIds = new Set((existingAcuses ?? []).map(a => a.periodo_id))
  const hasPending = closedIds.some(id => !confirmedIds.has(id))

  if (hasPending) {
    redirect(`/dashboard/${slug}/libreta/${alumno_id}/confirmar`)
  }

  redirect(`/dashboard/${slug}/libreta/${alumno_id}/boletin`)
}
