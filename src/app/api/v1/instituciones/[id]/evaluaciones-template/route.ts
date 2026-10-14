import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasRole } from '@/lib/auth'
import { ok, created, Err } from '@/lib/api'

const CreateSchema = z.object({
  nombre: z.string().min(1),
  tipo: z.enum(['parcial', 'final', 'recuperatorio', 'tp', 'concepto']),
  peso: z.number().positive().default(1),
  orden: z.number().int().positive().default(1),
  periodo_id: z.string().uuid().optional().nullable(),
  fecha: z.string().date().nullable().optional(),
  permite_recuperatorio: z.boolean().default(false),
}).strict()

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id: inst_id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()
  if (!isSuperadmin(session) && !hasRole(session, inst_id, 'admin')) return Err.forbidden()

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('evaluaciones_template')
    .select('id, nombre, tipo, peso, orden, periodo_id, fecha, periodos(nombre, orden)')
    .eq('institucion_id', inst_id)
    .is('deleted_at', null)
    .order('orden')

  if (error) return Err.server(error.message)

  // Count instances per template
  const ids = (data ?? []).map(t => t.id)
  const counts: Record<string, number> = {}
  if (ids.length > 0) {
    const { data: instances } = await supabase
      .from('evaluaciones')
      .select('template_id')
      .in('template_id', ids)
      .is('deleted_at', null)

    for (const row of instances ?? []) {
      if (row.template_id) counts[row.template_id] = (counts[row.template_id] ?? 0) + 1
    }
  }

  return ok((data ?? []).map(t => ({ ...t, instancias: counts[t.id] ?? 0 })))
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id: inst_id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()
  if (!isSuperadmin(session) && !hasRole(session, inst_id, 'admin')) return Err.forbidden()

  const supabase = await createClient()

  // Verify institution exists
  const { data: inst } = await supabase
    .from('instituciones')
    .select('id')
    .eq('id', inst_id)
    .is('deleted_at', null)
    .single()
  if (!inst) return Err.notFound()

  const body = await request.json().catch(() => null)
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) return Err.validation(parsed.error.issues[0].message)

  const { fecha, ...rest } = parsed.data
  const insertData: Record<string, unknown> = { ...rest, institucion_id: inst_id }
  if (fecha !== undefined) insertData.fecha = fecha

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: template, error } = await supabase
    .from('evaluaciones_template')
    .insert(insertData as any)
    .select('id, nombre, tipo, peso, orden, periodo_id, fecha')
    .single()

  if (error) return Err.server(error.message)

  // Resolve año_lectivo_id: from periodo (if given) or from active año_lectivo
  let añoLectivoId: string | null = null
  if (parsed.data.periodo_id) {
    const { data: periodoRaw } = await supabase
      .from('periodos')
      .select('*')
      .eq('id', parsed.data.periodo_id)
      .single()
    const periodo = periodoRaw as { año_lectivo_id: string } | null
    añoLectivoId = periodo?.año_lectivo_id ?? null
  } else {
    const { data: añoActivo } = await supabase
      .from('años_lectivos')
      .select('id')
      .eq('institucion_id', inst_id)
      .eq('activo', true)
      .is('deleted_at', null)
      .maybeSingle()
    añoLectivoId = (añoActivo as { id: string } | null)?.id ?? null
  }

  let propagated = 0
  if (añoLectivoId) {
    const { data: cursos } = await supabase
      .from('cursos')
      .select('id')
      .eq('institucion_id', inst_id)
      .eq('año_lectivo_id', añoLectivoId)
      .is('deleted_at', null)

    const cursoIds = (cursos ?? []).map(c => c.id)
    const { data: materias } = cursoIds.length > 0
      ? await supabase
          .from('materias')
          .select('id')
          .in('curso_id', cursoIds)
          .is('deleted_at', null)
      : { data: [] as Array<{ id: string }> }

    if (materias && materias.length > 0) {
      const instances = materias.map(m => ({
        materia_id: m.id,
        institucion_id: inst_id,
        ...(parsed.data.periodo_id ? { periodo_id: parsed.data.periodo_id } : {}),
        nombre: parsed.data.nombre,
        tipo: parsed.data.tipo,
        peso: parsed.data.peso ?? 1,
        orden: parsed.data.orden ?? 1,
        permite_recuperatorio: parsed.data.permite_recuperatorio,
        ...(fecha !== undefined && fecha !== null ? { fecha } : {}),
        template_id: template.id,
      }))

      const { error: propError } = await supabase.from('evaluaciones').insert(instances)
      if (!propError) propagated = instances.length
    }
  }

  return created({ template, propagated })
}
