import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasAnyRole } from '@/lib/auth'
import { ok, Err } from '@/lib/api'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const supabase = await createClient()
  const { data } = await supabase
    .from('comunicados')
    .select('id, titulo, contenido, curso_id, created_at, institucion_id, cursos(nombre), personas!autor_id(nombre, apellido), comunicado_confirmaciones(id, email, confirmed_at)')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!data) return Err.notFound('Comunicado no encontrado')

  if (!isSuperadmin(session) && !hasAnyRole(session, data.institucion_id, ['admin', 'docente']))
    return Err.forbidden()

  const confs = data.comunicado_confirmaciones ?? []
  return ok({
    id: data.id,
    titulo: data.titulo,
    contenido: data.contenido,
    curso_id: data.curso_id,
    created_at: data.created_at,
    cursos: data.cursos,
    autor: data.personas,
    total: confs.length,
    confirmados: confs.filter(c => c.confirmed_at !== null).length,
    confirmaciones: confs.map(c => ({ id: c.id, email: c.email, confirmed_at: c.confirmed_at })),
  })
}
