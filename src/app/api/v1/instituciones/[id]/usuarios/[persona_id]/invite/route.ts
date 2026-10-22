import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSession, isSuperadmin, hasRole } from '@/lib/auth'
import { ok, Err } from '@/lib/api'
import { logActividad } from '@/lib/actividad'
import { sendBienvenida } from '@/lib/email'

type Params = { params: Promise<{ id: string; persona_id: string }> }

export async function POST(_request: NextRequest, { params }: Params) {
  const { id: institucion_id, persona_id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()
  if (!isSuperadmin(session) && !hasRole(session, institucion_id, 'admin')) return Err.forbidden()

  const admin = createAdminClient()

  const { data: persona } = await admin
    .from('personas')
    .select('email, auth_id, nombre')
    .eq('id', persona_id)
    .single()

  if (!persona?.email) return Err.notFound('Persona no encontrada')
  if (!persona.auth_id) return Err.validation('Usuario sin cuenta auth')

  const { data: authUser } = await admin.auth.admin.getUserById(persona.auth_id)
  if (authUser?.user?.last_sign_in_at) return Err.validation('El usuario ya inició sesión')

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://libretadigital.app').replace(/\/$/, '')

  const { data: linkData, error } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email: persona.email,
    options: { redirectTo: `${appUrl}/update-password` },
  })

  if (error) return Err.server(error.message)

  logActividad({
    institucion_id,
    persona_id: session.persona_id,
    accion: 'invitar_usuario',
    entidad: 'usuario',
    entidad_id: persona_id,
    metadata: { email: persona.email },
  })

  const { data: membership } = await admin
    .from('memberships')
    .select('rol, instituciones(nombre, logo_rectangular_url)')
    .eq('persona_id', persona_id)
    .eq('institucion_id', institucion_id)
    .single()

  type InstRow = { nombre: string; logo_rectangular_url: string | null } | null
  const inst = membership?.instituciones as InstRow

  void sendBienvenida(persona.email, {
    nombre: persona.nombre ?? persona.email,
    email: persona.email,
    institucion_nombre: inst?.nombre ?? '',
    rol: membership?.rol ?? 'responsable',
    login_url: `${appUrl}/login`,
    setup_url: linkData?.properties?.action_link,
    logo_url: inst?.logo_rectangular_url ?? undefined,
  })

  return ok({ link: linkData?.properties?.action_link ?? null })
}
