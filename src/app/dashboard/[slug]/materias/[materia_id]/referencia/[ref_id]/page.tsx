import { requireSession, isSuperadmin, hasAnyRole, hasRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import NotasRefEditor from './notas-ref-editor'

type Params = { params: Promise<{ slug: string; materia_id: string; ref_id: string }> }

const TIPO_LABELS: Record<string, string> = {
  numerica: 'Numérica',
  conceptual: 'Conceptual',
}

export default async function NotasReferenciaPage({ params }: Params) {
  const { slug, materia_id, ref_id } = await params
  const session = await requireSession()

  const supabase = await createClient()
  const { data: inst } = await supabase
    .from('instituciones')
    .select('id')
    .eq('slug', slug)
    .is('deleted_at', null)
    .single()

  if (!inst) {
    if (isSuperadmin(session)) redirect('/dashboard/instituciones')
    notFound()
  }
  if (!isSuperadmin(session) && !hasAnyRole(session, inst.id, ['admin', 'docente']))
    redirect(`/dashboard/${slug}`)

  const isAdminLevel = isSuperadmin(session) || hasRole(session, inst.id, 'admin')
  if (!isAdminLevel) {
    if (!session.persona_id) redirect(`/dashboard/${slug}`)
    const { data: assignment } = await supabase
      .from('materia_docentes')
      .select('persona_id')
      .eq('materia_id', materia_id)
      .eq('persona_id', session.persona_id)
      .maybeSingle()
    if (!assignment) redirect(`/dashboard/${slug}`)
  }

  const { data: evRef } = await supabase
    .from('evaluaciones_referencia')
    .select('id, nombre, tipo, fecha, evaluacion_referencia_dimensiones(dimension_id, materias_dimensiones(id, nombre, orden))')
    .eq('id', ref_id)
    .is('deleted_at', null)
    .single()

  if (!evRef) notFound()

  const { data: materia } = await supabase
    .from('materias')
    .select('id, materias_catalogo(nombre), cursos(id, nombre)')
    .eq('id', materia_id)
    .eq('institucion_id', inst.id)
    .is('deleted_at', null)
    .single()

  if (!materia) notFound()

  const materiaNombre = (materia.materias_catalogo as { nombre: string } | null)?.nombre ?? ''
  const cursoRaw = materia.cursos as { id: string; nombre: string } | null
  const cursoId = cursoRaw?.id ?? ''

  const { data: inscripciones } = await supabase
    .from('alumno_inscripciones')
    .select('alumno_id')
    .eq('curso_id', cursoId)
    .eq('activo', true)
    .is('deleted_at', null)

  const alumnoIds = (inscripciones ?? []).map(i => i.alumno_id)

  const { data: alumnos } = alumnoIds.length > 0
    ? await supabase
        .from('alumnos')
        .select('id, nombre, apellido')
        .in('id', alumnoIds)
        .eq('activo', true)
        .is('deleted_at', null)
        .order('apellido', { nullsFirst: false })
        .order('nombre')
    : { data: [] }

  const { data: notasExistentes } = await supabase
    .from('notas_referencia')
    .select('alumno_id, dimension_id, valor_numerico, valor_literal, observacion')
    .eq('evaluacion_ref_id', ref_id)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <Link href={`/dashboard/${slug}/materias/${materia_id}/referencia`} className="hover:text-foreground">
            {materiaNombre} — Referencia
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{evRef.nombre}</h1>
          <Badge variant="outline">{TIPO_LABELS[evRef.tipo] ?? evRef.tipo}</Badge>
        </div>
        {evRef.fecha && (
          <p className="text-sm text-muted-foreground">{evRef.fecha}</p>
        )}
      </div>

      <NotasRefEditor
        evalRefId={ref_id}
        tipo={evRef.tipo as 'numerica' | 'conceptual'}
        alumnos={alumnos ?? []}
        notasExistentes={(notasExistentes ?? []) as Array<{ alumno_id: string; dimension_id: string | null; valor_numerico: number | null; valor_literal: string | null; observacion: string | null }>}
        dimensiones={
          ([...(evRef.evaluacion_referencia_dimensiones as Array<{ materias_dimensiones: { id: string; nombre: string; orden: number } | null }> ?? [])]
            .map(d => d.materias_dimensiones)
            .filter((d): d is { id: string; nombre: string; orden: number } => d !== null)
            .sort((a, b) => a.orden - b.orden))
        }
      />
    </div>
  )
}
