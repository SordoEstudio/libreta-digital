import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasRole } from '@/lib/auth'
import { ok, created, Err } from '@/lib/api'

const Body = z.object({
  alumno_id:  z.string().uuid(),
  periodo_id: z.string().uuid(),
  texto:      z.string().max(1000),
})

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const body = await request.json().catch(() => null)
  const parsed = Body.safeParse(body)
  if (!parsed.success) return Err.validation(parsed.error.issues[0].message)

  const supabase = await createClient()

  const { data: alumno } = await supabase
    .from('alumnos')
    .select('id, institucion_id')
    .eq('id', parsed.data.alumno_id)
    .is('deleted_at', null)
    .maybeSingle()

  if (!alumno) return Err.notFound()

  const isAdmin = isSuperadmin(session) || hasRole(session, alumno.institucion_id, 'admin')

  let isDocente = false
  if (!isAdmin && session.persona_id) {
    const { data: inscripciones } = await supabase
      .from('alumno_inscripciones')
      .select('curso_id')
      .eq('alumno_id', parsed.data.alumno_id)
      .eq('activo', true)
      .is('deleted_at', null)
    const cursoIds = (inscripciones ?? []).map(i => i.curso_id)

    if (cursoIds.length > 0) {
      const { data: materias } = await supabase
        .from('materias')
        .select('id')
        .in('curso_id', cursoIds)
        .is('deleted_at', null)
      const materiaIds = (materias ?? []).map(m => m.id)

      if (materiaIds.length > 0) {
        const { data: materiaDocente } = await supabase
          .from('materia_docentes')
          .select('materia_id')
          .eq('persona_id', session.persona_id)
          .in('materia_id', materiaIds)
          .limit(1)
          .maybeSingle()
        isDocente = !!materiaDocente
      }
    }
  }

  if (!isAdmin && !isDocente) return Err.forbidden()

  const texto = parsed.data.texto.trim()

  if (texto === '') {
    await supabase
      .from('observaciones_boletin')
      .delete()
      .eq('alumno_id', parsed.data.alumno_id)
      .eq('periodo_id', parsed.data.periodo_id)
    return ok({})
  }

  const { data: upserted, error } = await supabase
    .from('observaciones_boletin')
    .upsert(
      {
        alumno_id:  parsed.data.alumno_id,
        periodo_id: parsed.data.periodo_id,
        texto,
        autor_id:   session.persona_id ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'alumno_id,periodo_id' }
    )
    .select('id, texto, updated_at')
    .single()

  if (error) return Err.server(error.message)

  return created({ observacion: upserted })
}
