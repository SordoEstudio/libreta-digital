import { requireSession, isSuperadmin, hasRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import NuevoUsuarioSheet from '../usuarios/nuevo-usuario-sheet'
import UsuariosTabla from '../usuarios/usuarios-tabla'
import { EmptyState } from '@/components/ui/empty-state'
import { UserCog } from 'lucide-react'

type Params = { params: Promise<{ slug: string }> }

const PERSONAL_ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'docente', label: 'Docente' },
]

export default async function PersonalPage({ params }: Params) {
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
  if (!isSuperadmin(session) && !hasRole(session, inst.id, 'admin')) redirect('/dashboard')

  const admin = createAdminClient()
  const { data: memberships } = await admin
    .from('memberships')
    .select('rol, activo, personas(id, nombre, apellido, email, telefono, dni, direccion)')
    .eq('institucion_id', inst.id)
    .in('rol', ['admin', 'docente'])
    .order('rol')

  type PersonaCol = { id: string; nombre: string; apellido: string | null; email: string | null; telefono: string | null; dni: string | null; direccion: string | null } | null
  type ChipItem = { id: string; nombre: string }

  const personaIds = (memberships ?? []).map(m => (m.personas as PersonaCol)?.id).filter(Boolean) as string[]

  const pendienteSet = new Set<string>()
  if (personaIds.length > 0) {
    const { data: loginStatus } = await admin.rpc('get_personas_login_status', { p_ids: personaIds })
    for (const row of loginStatus ?? []) {
      if (!row.has_logged_in) pendienteSet.add(row.persona_id)
    }
  }

  const docenteIds = (memberships ?? [])
    .filter(m => m.rol === 'docente')
    .map(m => (m.personas as PersonaCol)?.id).filter(Boolean) as string[]

  const materiasByDocente: Record<string, ChipItem[]> = {}

  if (docenteIds.length > 0) {
    const { data: asignaciones } = await admin
      .from('materia_docentes')
      .select('persona_id, materias(id, nombre)')
      .in('persona_id', docenteIds)
    for (const a of asignaciones ?? []) {
      const materia = a.materias as unknown as ChipItem | null
      if (!materia) continue
      if (!materiasByDocente[a.persona_id]) materiasByDocente[a.persona_id] = []
      materiasByDocente[a.persona_id].push(materia)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Personal</h1>
          <p className="text-sm text-muted-foreground">{memberships?.filter(m => m.activo).length ?? 0} miembros activos</p>
        </div>
        <NuevoUsuarioSheet instId={inst.id} roles={PERSONAL_ROLES} />
      </div>

      {(memberships ?? []).filter(m => m.activo).length === 0 ? (
        <EmptyState
          icon={UserCog}
          title="Sin personal activo"
          description="Agregá el primer miembro del equipo para gestionar la institución."
          action={<NuevoUsuarioSheet instId={inst.id} roles={PERSONAL_ROLES} />}
        />
      ) : (
        <UsuariosTabla
          instId={inst.id}
          availableRoles={['admin', 'docente']}
          rolesEdicion={PERSONAL_ROLES}
          usuarios={(memberships ?? []).map(m => {
            const persona = m.personas as PersonaCol
            const id = persona?.id ?? ''
            return {
              personaId: id,
              nombre: persona?.nombre ?? '—',
              apellido: persona?.apellido ?? null,
              email: persona?.email ?? null,
              rol: m.rol,
              activo: m.activo,
              pendiente: pendienteSet.has(id),
              telefono: persona?.telefono ?? null,
              dni: persona?.dni ?? null,
              direccion: persona?.direccion ?? null,
              alumnos: [],
              materias: materiasByDocente[id] ?? [],
            }
          })}
        />
      )}
    </div>
  )
}
