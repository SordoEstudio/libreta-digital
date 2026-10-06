import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSession, isSuperadmin, hasRole } from '@/lib/auth'
import { ok, created, Err } from '@/lib/api'

const CreateSchema = z.object({
  persona_id: z.string().uuid(),
  relacion: z.string().optional(),
})

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id: alumno_id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const supabase = await createClient()
  const { data: alumno } = await supabase
    .from('alumnos')
    .select('institucion_id')
    .eq('id', alumno_id)
    .single()

  if (!alumno) return Err.notFound()
  if (!isSuperadmin(session) && !hasRole(session, alumno.institucion_id, 'admin')) return Err.forbidden()

  // personas_select is own-only — use admin client to read responsable names
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('alumno_responsables')
    .select('persona_id, relacion, personas(id, nombre, apellido, email, telefono, dni, direccion)')
    .eq('alumno_id', alumno_id)

  if (error) return Err.server(error.message)

  type P = { nombre: string; apellido: string | null; email: string | null; telefono: string | null; dni: string | null; direccion: string | null } | null
  const result = data.map(r => {
    const p = r.personas as P
    return {
      persona_id: r.persona_id,
      relacion: r.relacion,
      nombre: p?.nombre ?? '',
      apellido: p?.apellido ?? null,
      email: p?.email ?? null,
      telefono: p?.telefono ?? null,
      dni: p?.dni ?? null,
      direccion: p?.direccion ?? null,
    }
  })

  return ok(result)
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id: alumno_id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const supabase = await createClient()
  const { data: alumno } = await supabase
    .from('alumnos')
    .select('institucion_id')
    .eq('id', alumno_id)
    .single()

  if (!alumno) return Err.notFound()
  if (!isSuperadmin(session) && !hasRole(session, alumno.institucion_id, 'admin')) return Err.forbidden()

  const body = await request.json().catch(() => null)
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) return Err.validation(parsed.error.issues[0].message)

  const { error } = await supabase
    .from('alumno_responsables')
    .insert({
      alumno_id,
      persona_id: parsed.data.persona_id,
      relacion: parsed.data.relacion,
      institucion_id: alumno.institucion_id,
    })

  if (error) {
    if (error.code === '23505') return Err.conflict('El responsable ya está vinculado a este alumno')
    return Err.server(error.message)
  }

  return created({ alumno_id, persona_id: parsed.data.persona_id })
}
