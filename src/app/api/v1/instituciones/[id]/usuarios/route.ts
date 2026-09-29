import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSession, isSuperadmin, hasRole, hasAnyRole } from '@/lib/auth'
import { ok, created, Err } from '@/lib/api'
import { sendBienvenida } from '@/lib/email'

const CreateSchema = z.object({
  email: z.string().email(),
  nombre: z.string().min(1),
  rol: z.enum(['admin', 'docente', 'responsable']),
  send_invite: z.boolean().default(true),
})

type Params = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  const { id: institucion_id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()
  if (!isSuperadmin(session) && !hasRole(session, institucion_id, 'admin')) return Err.forbidden()

  const sp = request.nextUrl.searchParams
  const rol = sp.get('rol')
  const q = sp.get('q')

  const admin = createAdminClient()
  let query = admin
    .from('memberships')
    .select('rol, personas(id, nombre, email)')
    .eq('institucion_id', institucion_id)
    .eq('activo', true)

  if (rol) query = query.eq('rol', rol)

  const { data, error } = await query
  if (error) return Err.server(error.message)

  let usuarios = data.map(m => ({
    persona_id: (m.personas as { id: string } | null)?.id,
    nombre: (m.personas as { nombre: string } | null)?.nombre ?? '',
    email: (m.personas as { email: string | null } | null)?.email ?? null,
    rol: m.rol,
  }))

  if (q) {
    const lower = q.toLowerCase()
    usuarios = usuarios.filter(u =>
      u.nombre.toLowerCase().includes(lower) ||
      (u.email ?? '').toLowerCase().includes(lower)
    )
  }

  return ok(usuarios)
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id: institucion_id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()
  if (!isSuperadmin(session) && !hasRole(session, institucion_id, 'admin')) return Err.forbidden()

  const body = await request.json().catch(() => null)
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) return Err.validation(parsed.error.issues[0].message)

  const { email, nombre, rol } = parsed.data
  const supabase = await createClient()
  const admin = createAdminClient()

  // personas has no INSERT policy and SELECT is own-only — use admin client
  const { data: existente } = await admin
    .from('personas')
    .select('id')
    .eq('email', email)
    .is('deleted_at', null)
    .single()

  let persona_id: string
  let isNewUser = false

  if (existente) {
    persona_id = existente.id
    const { data: existingMembership } = await admin
      .from('memberships')
      .select('id')
      .eq('persona_id', persona_id)
      .eq('institucion_id', institucion_id)
      .eq('rol', rol)
      .eq('activo', true)
      .single()

    if (existingMembership) return Err.conflict('Usuario ya tiene ese rol en esta institución')
  } else {
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
    })
    if (authError || !authData.user) return Err.server(authError?.message ?? 'Error al crear usuario')

    const { data: persona, error: personaError } = await admin
      .from('personas')
      .insert({ nombre, email, auth_id: authData.user.id })
      .select('id')
      .single()

    if (personaError) return Err.server(personaError.message)
    persona_id = persona.id
    isNewUser = true
  }

  const { error: membError } = await admin
    .from('memberships')
    .insert({ persona_id, institucion_id, rol })

  if (membError) return Err.server(membError.message)

  const { data: inst } = await supabase
    .from('instituciones')
    .select('nombre')
    .eq('id', institucion_id)
    .single()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://libretadigital.app'
  let setup_url: string | undefined
  if (isNewUser) {
    const { data: linkData } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: `${appUrl}/update-password` },
    })
    setup_url = linkData?.properties?.action_link
  }

  void sendBienvenida(email, {
    nombre,
    email,
    institucion_nombre: inst?.nombre ?? '',
    rol,
    login_url: `${appUrl}/login`,
    setup_url,
  })

  return created({ persona_id, email, rol })
}
