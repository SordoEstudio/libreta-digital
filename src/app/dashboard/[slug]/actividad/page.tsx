import { requireSession, isSuperadmin, hasRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import { ActividadTable, type ActividadRow } from './actividad-table'

type PageProps = { params: Promise<{ slug: string }> }

export default async function ActividadPage({ params }: PageProps) {
  const { slug } = await params
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

  const { data: logs } = await admin
    .from('actividad_log')
    .select('id, accion, entidad, entidad_id, metadata, created_at, personas(nombre, apellido)')
    .eq('institucion_id', inst.id)
    .order('created_at', { ascending: false })
    .limit(500)

  const rows = (logs ?? []) as ActividadRow[]

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold md:text-2xl">Registro de actividad</h1>
        <p className="text-sm text-muted-foreground">Últimas {rows.length} acciones registradas</p>
      </div>

      <ActividadTable rows={rows} />
    </div>
  )
}
