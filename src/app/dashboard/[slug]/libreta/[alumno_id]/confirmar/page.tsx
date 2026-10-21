import { requireSession, isSuperadmin, hasRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'
import ConfirmarButton from './confirmar-button'

type Params = { params: Promise<{ slug: string; alumno_id: string }> }

export default async function ConfirmarPage({ params }: Params) {
  const { slug, alumno_id } = await params
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

  // Only pure responsables (not admin/docente) access this page
  const isResponsableOnly =
    !isSuperadmin(session) &&
    !hasRole(session, inst.id, 'admin') &&
    !hasRole(session, inst.id, 'docente') &&
    hasRole(session, inst.id, 'responsable')

  if (!isResponsableOnly || !session.persona_id) {
    redirect(`/dashboard/${slug}/libreta/${alumno_id}/boletin`)
  }

  // Verify responsable is linked to this alumno
  const { data: vinculacion } = await supabase
    .from('alumno_responsables')
    .select('alumno_id')
    .eq('alumno_id', alumno_id)
    .eq('persona_id', session.persona_id)
    .maybeSingle()

  if (!vinculacion) redirect(`/dashboard/${slug}/mis-alumnos`)

  // Get alumno info
  const admin = createAdminClient()
  const { data: alumno } = await admin
    .from('alumnos')
    .select('nombre, apellido')
    .eq('id', alumno_id)
    .eq('institucion_id', inst.id)
    .single()

  if (!alumno) notFound()

  // Get closed periods for the alumno's active year
  const { data: inscripcion } = await supabase
    .from('alumno_inscripciones')
    .select('cursos(año_lectivo_id)')
    .eq('alumno_id', alumno_id)
    .eq('activo', true)
    .is('deleted_at', null)
    .maybeSingle()

  const añoLectivoId = (inscripcion?.cursos as { año_lectivo_id: string } | null)?.año_lectivo_id

  if (!añoLectivoId) {
    redirect(`/dashboard/${slug}/libreta/${alumno_id}/boletin`)
  }

  const { data: closedPeriods } = await supabase
    .from('periodos')
    .select('id, nombre, orden')
    .eq('año_lectivo_id', añoLectivoId)
    .not('cerrado_at', 'is', null)
    .is('deleted_at', null)
    .order('orden')

  const closedIds = (closedPeriods ?? []).map(p => p.id)

  if (closedIds.length === 0) {
    redirect(`/dashboard/${slug}/libreta/${alumno_id}/boletin`)
  }

  // Filter to only unconfirmed periods
  const { data: existingAcuses } = await supabase
    .from('boletin_acuses')
    .select('periodo_id')
    .eq('persona_id', session.persona_id)
    .in('periodo_id', closedIds)

  const confirmedIds = new Set((existingAcuses ?? []).map((a: { periodo_id: string }) => a.periodo_id))
  const pendingPeriods = (closedPeriods ?? []).filter(p => !confirmedIds.has(p.id))

  // Nothing pending → go directly to boletín
  if (pendingPeriods.length === 0) {
    redirect(`/dashboard/${slug}/libreta/${alumno_id}/boletin`)
  }

  const alumnoNombre = alumno.apellido
    ? `${alumno.apellido}, ${alumno.nombre}`
    : alumno.nombre

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="w-full max-w-md flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">Recepción del boletín</h1>
          <p className="text-sm text-muted-foreground">{alumnoNombre} · {inst.nombre}</p>
        </div>

        <div className="rounded-xl border p-5 flex flex-col gap-4">
          <p className="text-sm leading-relaxed">
            Al continuar confirmás haber recibido el boletín de{' '}
            <strong>{alumno.nombre}</strong> con los siguientes períodos publicados:
          </p>
          <ul className="flex flex-col gap-2">
            {pendingPeriods.map(p => (
              <li key={p.id} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                <span>{p.nombre}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground border-t pt-3">
            Esta confirmación queda registrada con fecha y hora. No se puede deshacer.
          </p>
        </div>

        <ConfirmarButton
          alumnoId={alumno_id}
          periodoIds={pendingPeriods.map(p => p.id)}
          slug={slug}
        />
      </div>
    </div>
  )
}
