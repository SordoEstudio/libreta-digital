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

  if (!inst) {
    if (isSuperadmin(session)) redirect('/dashboard/instituciones')
    notFound()
  }
  if (!isSuperadmin(session) && !hasRole(session, inst.id, 'admin')) redirect('/dashboard')

  const admin = createAdminClient()
  const { data: memberships } = await admin
    .from('memberships')
    .select('rol, activo, personas(id, nombre, email, telefono, dni, direccion)')
    .eq('institucion_id', inst.id)
    .order('rol')

  type PersonaCol = { id: string; nombre: string; email: string | null; telefono: string | null; dni: string | null; direccion: string | null } | null
  type ChipItem = { id: string; nombre: string }

  const personaIds = (memberships ?? []).map(m => (m.personas as PersonaCol)?.id).filter(Boolean) as string[]

  let pendienteSet = new Set<string>()
  if (personaIds.length > 0) {
    const { data: loginStatus } = await admin.rpc('get_personas_login_status', { p_ids: personaIds })
    for (const row of loginStatus ?? []) {
      if (!row.has_logged_in) pendienteSet.add(row.persona_id)
    }
  }

  const responsableIds = (memberships ?? [])
    .filter(m => m.rol === 'responsable')
    .map(m => (m.personas as PersonaCol)?.id).filter(Boolean) as string[]
  const docenteIds = (memberships ?? [])
    .filter(m => m.rol === 'docente')
    .map(m => (m.personas as PersonaCol)?.id).filter(Boolean) as string[]

  const alumnosByResponsable: Record<string, ChipItem[]> = {}
  const materiasByDocente: Record<string, ChipItem[]> = {}

  if (responsableIds.length > 0) {
    const { data: relaciones } = await admin
      .from('alumno_responsables')
      .select('persona_id, alumnos(id, nombre)')
      .in('persona_id', responsableIds)
    for (const r of relaciones ?? []) {
      const alumno = r.alumnos as ChipItem | null
      if (!alumno) continue
      if (!alumnosByResponsable[r.persona_id]) alumnosByResponsable[r.persona_id] = []
      alumnosByResponsable[r.persona_id].push(alumno)
    }
  }

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
          <h1 className="text-2xl font-semibold">Usuarios</h1>
          <p className="text-sm text-muted-foreground">{memberships?.filter(m => m.activo).length ?? 0} miembros activos</p>
        </div>
        <NuevoUsuarioSheet instId={inst.id} />
      </div>

      <UsuariosTabla
        instId={inst.id}
        usuarios={(memberships ?? []).map(m => {
          const persona = m.personas as PersonaCol
          const id = persona?.id ?? ''
          return {
            personaId: id,
            nombre: persona?.nombre ?? '—',
            email: persona?.email ?? null,
            rol: m.rol,
            activo: m.activo,
            pendiente: pendienteSet.has(id),
            telefono: persona?.telefono ?? null,
            dni: persona?.dni ?? null,
            direccion: persona?.direccion ?? null,
            alumnos: alumnosByResponsable[id] ?? [],
            materias: materiasByDocente[id] ?? [],
          }
        })}
      />
    </div>
  )
}
