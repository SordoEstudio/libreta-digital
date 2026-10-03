import { requireSession, isSuperadmin, hasAnyRole, hasRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import HomeAdmin from './home-admin'
import HomeDocente from './home-docente'
import HomeResponsable from './home-responsable'

type Params = { params: Promise<{ slug: string }> }

export default async function InstitucionDashboardPage({ params }: Params) {
  const { slug } = await params
  const session = await requireSession()

  const supabase = await createClient()
  const { data: inst } = await supabase
    .from('instituciones')
    .select('id, nombre, tipo, activa')
    .eq('slug', slug)
    .is('deleted_at', null)
    .single()

  if (!inst) {
    if (isSuperadmin(session)) redirect('/dashboard/instituciones')
    notFound()
  }

  if (!isSuperadmin(session) && !hasAnyRole(session, inst.id, ['admin', 'docente', 'responsable']))
    redirect('/dashboard')

  const isAdmin = isSuperadmin(session) || hasRole(session, inst.id, 'admin')
  const isDocente = hasRole(session, inst.id, 'docente')
  const isResponsable = hasRole(session, inst.id, 'responsable')

  if (isAdmin) {
    return <HomeAdmin instId={inst.id} slug={slug} instNombre={inst.nombre} instTipo={inst.tipo} />
  }

  if (isDocente && session.persona_id) {
    return <HomeDocente instId={inst.id} slug={slug} personaId={session.persona_id} />
  }

  if (isResponsable && session.persona_id) {
    return <HomeResponsable instId={inst.id} slug={slug} personaId={session.persona_id} />
  }

  // Fallback: sin persona_id o rol no reconocido
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{inst.nombre}</h1>
        <p className="text-sm text-muted-foreground">{inst.tipo ?? 'Institución educativa'}</p>
      </div>
    </div>
  )
}
