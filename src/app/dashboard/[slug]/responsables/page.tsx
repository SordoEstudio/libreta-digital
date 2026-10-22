import { requireSession, isSuperadmin, hasRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import NuevoUsuarioSheet from '../usuarios/nuevo-usuario-sheet'
import UsuariosTabla from '../usuarios/usuarios-tabla'

type Params = { params: Promise<{ slug: string }> }

const RESPONSABLE_ROLES = [{ value: 'responsable', label: 'Responsable' }]

export default async function ResponsablesPage({ params }: Params) {
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
    .in('rol', ['responsable'])

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

  const responsableIds = personaIds

  // Find alumnos self-linked (autoresponsable) to mark them
  const autoAlumnoIds = new Set<string>()
  if (responsableIds.length > 0) {
    const { data: autoAlumnos } = await admin
      .from('alumnos')
      .select('id')
      .eq('institucion_id', inst.id)
      .in('persona_id', responsableIds)
    for (const a of autoAlumnos ?? []) autoAlumnoIds.add(a.id)
  }

  const alumnosByResponsable: Record<string, ChipItem[]> = {}

  if (responsableIds.length > 0) {
    const { data: relaciones } = await admin
      .from('alumno_responsables')
      .select('persona_id, alumnos(id, nombre)')
      .in('persona_id', responsableIds)
    for (const r of relaciones ?? []) {
      const alumno = r.alumnos as ChipItem | null
      if (!alumno) continue
      if (!alumnosByResponsable[r.persona_id]) alumnosByResponsable[r.persona_id] = []
      alumnosByResponsable[r.persona_id].push({
        id: alumno.id,
        nombre: autoAlumnoIds.has(alumno.id) ? `${alumno.nombre} (auto)` : alumno.nombre,
      })
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Responsables</h1>
          <p className="text-sm text-muted-foreground">{memberships?.filter(m => m.activo).length ?? 0} responsables activos</p>
        </div>
        <NuevoUsuarioSheet
          instId={inst.id}
          roles={RESPONSABLE_ROLES}
          buttonLabel="Nuevo responsable"
          sheetTitle="Nuevo responsable"
          submitLabel="Crear responsable"
        />
      </div>

      <UsuariosTabla
        instId={inst.id}
        availableRoles={['responsable']}
        rolesEdicion={RESPONSABLE_ROLES}
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
            alumnos: alumnosByResponsable[id] ?? [],
            materias: [],
          }
        })}
      />
    </div>
  )
}
