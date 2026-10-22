import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export type Membership = {
  institucion_id: string
  rol: 'superadmin' | 'admin' | 'docente' | 'responsable' | 'alumno'
}

export type SessionUser = {
  auth_id: string
  email: string
  persona_id: string | null
  nombre: string | null
  memberships: Membership[]
  sin_institucion: boolean
}

export async function getSession(): Promise<SessionUser | null> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) return null

  const metadata = user.app_metadata

  // JWT enriched by Custom Access Token Hook (Team plan)
  if (metadata?.persona_id) {
    return {
      auth_id: user.id,
      email: user.email ?? '',
      persona_id: metadata.persona_id,
      nombre: metadata.nombre ?? null,
      memberships: metadata.memberships ?? [],
      sin_institucion: metadata.sin_institucion ?? false,
    }
  }

  // Hook unavailable (free plan) — query DB directly.
  // auth.uid() is always present so RLS still works.
  const { data: persona } = await supabase
    .from('personas')
    .select('id, nombre')
    .eq('auth_id', user.id)
    .single()

  if (!persona) {
    return {
      auth_id: user.id,
      email: user.email ?? '',
      persona_id: null,
      nombre: null,
      memberships: [],
      sin_institucion: true,
    }
  }

  const { data: memberships } = await supabase
    .from('memberships')
    .select('institucion_id, rol')
    .eq('persona_id', persona.id)
    .eq('activo', true)

  return {
    auth_id: user.id,
    email: user.email ?? '',
    persona_id: persona.id,
    nombre: persona.nombre,
    memberships: (memberships ?? []) as Membership[],
    sin_institucion: (memberships ?? []).length === 0,
  }
}

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession()
  if (!session) redirect('/login')
  return session
}

export function hasRole(
  session: SessionUser,
  institucion_id: string,
  roles: Membership['rol'] | Membership['rol'][]
): boolean {
  const allowedRoles = Array.isArray(roles) ? roles : [roles]
  return session.memberships.some(
    m => m.institucion_id === institucion_id && allowedRoles.includes(m.rol)
  )
}

export function isSuperadmin(session: SessionUser): boolean {
  return session.memberships.some(m => m.rol === 'superadmin')
}

export function hasAnyRole(
  session: SessionUser,
  institucion_id: string,
  roles: Membership['rol'][]
): boolean {
  return session.memberships.some(
    m => m.institucion_id === institucion_id && roles.includes(m.rol)
  )
}

export function getActiveInstitucion(session: SessionUser): string | null {
  const nonSuperadmin = session.memberships.find(m => m.rol !== 'superadmin')
  return nonSuperadmin?.institucion_id ?? null
}

export async function requireRole(
  institucion_id: string,
  roles: Membership['rol'] | Membership['rol'][]
): Promise<SessionUser> {
  const session = await requireSession()

  if (isSuperadmin(session)) return session

  if (!hasRole(session, institucion_id, roles)) {
    throw new Error('FORBIDDEN')
  }

  return session
}
