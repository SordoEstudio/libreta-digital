import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSession, isSuperadmin, hasRole } from '@/lib/auth'
import { ok, Err } from '@/lib/api'
import { sendBienvenida } from '@/lib/email'

type Params = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: alumno } = await admin
    .from('alumnos')
    .select('id, nombre, apellido, email, persona_id, institucion_id')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!alumno) return Err.notFound()
  if (!isSuperadmin(session) && !hasRole(session, alumno.institucion_id, 'admin')) return Err.forbidden()

  const email = alumno.email?.trim().toLowerCase()
  if (!email) return Err.validation('El alumno no tiene email registrado')

  const institucion_id = alumno.institucion_id
  const isGmail = email.endsWith('@gmail.com') || email.endsWith('@googlemail.com')

  // findOrCreate persona
  const { data: existente } = await admin
    .from('personas')
    .select('id')
    .eq('email', email)
    .is('deleted_at', null)
    .maybeSingle()

  let persona_id: string
  let isNewUser = false

  if (existente) {
    persona_id = existente.id
  } else {
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
    })
    if (authError || !authData.user) return Err.server(authError?.message ?? 'Error al crear usuario')

    const { data: persona, error: personaError } = await admin
      .from('personas')
      .insert({
        nombre: alumno.nombre,
        apellido: alumno.apellido,
        email,
        auth_id: authData.user.id,
      })
      .select('id')
      .single()

    if (personaError) return Err.server(personaError.message)
    persona_id = persona.id
    isNewUser = true
  }

  // Check if already has alumno membership
  const { data: existingMembership } = await admin
    .from('memberships')
    .select('id')
    .eq('persona_id', persona_id)
    .eq('institucion_id', institucion_id)
    .eq('rol', 'alumno')
    .eq('activo', true)
    .maybeSingle()

  if (existingMembership) {
    return ok({ persona_id, email, setup_url: null, ya_existia: true })
  }

  const { error: membError } = await admin
    .from('memberships')
    .insert({ persona_id, institucion_id, rol: 'alumno' })
  if (membError) return Err.server(membError.message)

  // Link alumno.persona_id if not already set
  if (!alumno.persona_id) {
    await admin.from('alumnos').update({ persona_id }).eq('id', id)
  }

  const { data: inst } = await supabase
    .from('instituciones')
    .select('nombre, logo_rectangular_url')
    .eq('id', institucion_id)
    .single()

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://libretadigital.app').replace(/\/$/, '')
  let setup_url: string | undefined

  if (isNewUser && !isGmail) {
    const { data: linkData } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: `${appUrl}/update-password` },
    })
    setup_url = linkData?.properties?.action_link
  }

  void sendBienvenida(email, {
    nombre: alumno.nombre,
    email,
    institucion_nombre: inst?.nombre ?? '',
    rol: 'responsable',
    login_url: `${appUrl}/login`,
    setup_url,
    logo_url: inst?.logo_rectangular_url ?? undefined,
  })

  return ok({ persona_id, email, setup_url: setup_url ?? null, ya_existia: false })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const admin = createAdminClient()

  const { data: alumno } = await admin
    .from('alumnos')
    .select('persona_id, institucion_id')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!alumno) return Err.notFound()
  if (!isSuperadmin(session) && !hasRole(session, alumno.institucion_id, 'admin')) return Err.forbidden()
  if (!alumno.persona_id) return Err.validation('Alumno no tiene acceso asignado')

  const { error } = await admin
    .from('memberships')
    .update({ activo: false })
    .eq('persona_id', alumno.persona_id)
    .eq('institucion_id', alumno.institucion_id)
    .eq('rol', 'alumno')

  if (error) return Err.server(error.message)
  return ok({ revocado: true })
}
