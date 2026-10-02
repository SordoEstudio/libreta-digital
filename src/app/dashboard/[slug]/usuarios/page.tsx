import { requireSession, isSuperadmin, hasRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import NuevoUsuarioSheet from './nuevo-usuario-sheet'
import UsuariosTabla from './usuarios-tabla'

type Params = { params: Promise<{ slug: string }> }


export default async function UsuariosPage({ params }: Params) {
  const { slug } = await params
  const session = await requireSession()

  const supabase = await createClient()
  const { data: inst } = await supabase
    .from('instituciones')
    .select('id, nombre')
    .eq('slug', slug)
    .is('deleted_at', null)
    .single()

  if (!inst) notFound()
  if (!isSuperadmin(session) && !hasRole(session, inst.id, 'admin')) redirect('/dashboard')

  const admin = createAdminClient()
  const { data: memberships } = await admin
    .from('memberships')
    .select('rol, activo, personas(id, nombre, email, telefono, dni, direccion)')
    .eq('institucion_id', inst.id)
    .order('rol')

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Usuarios</h1>
          <p className="text-sm text-muted-foreground">{memberships?.filter(m => m.activo).length ?? 0} miembros activos</p>
        </div>
        <NuevoUsuarioSheet instId={inst.id} />
      </div>

      <UsuariosTabla
        instId={inst.id}
        usuarios={(memberships ?? []).map(m => {
          const persona = m.personas as { id: string; nombre: string; email: string | null; telefono: string | null; dni: string | null; direccion: string | null } | null
          return {
            personaId: persona?.id ?? '',
            nombre: persona?.nombre ?? '—',
            email: persona?.email ?? null,
            rol: m.rol,
            activo: m.activo,
            telefono: persona?.telefono ?? null,
            dni: persona?.dni ?? null,
            direccion: persona?.direccion ?? null,
          }
        })}
      />
    </div>
  )
}
