import { requireSession, isSuperadmin, hasAnyRole, hasRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { NotasEditor } from './notas-editor'
import EditarEvaluacionSheet from '@/app/dashboard/[slug]/materias/[materia_id]/evaluaciones/editar-evaluacion-sheet'

type Params = {
  params: Promise<{ slug: string; evaluacion_id: string }>
  searchParams: Promise<{ from?: string; materia_id?: string; periodo_id?: string }>
}

export default async function NotasPage({ params, searchParams }: Params) {
  const { slug, evaluacion_id } = await params
  const { from, materia_id, periodo_id } = await searchParams

  const fromCuaderno = from === 'cuaderno'
  const backUrl = fromCuaderno
    ? `/dashboard/${slug}/cuaderno?materia_id=${materia_id ?? ''}&periodo_id=${periodo_id ?? ''}`
    : null
  const session = await requireSession()

  const supabase = await createClient()
  const { data: inst } = await supabase
    .from('instituciones')
    .select('id')
    .eq('slug', slug)
    .single()

  if (!inst) {
    if (isSuperadmin(session)) redirect('/dashboard/instituciones')
    notFound()
  }
  if (!isSuperadmin(session) && !hasAnyRole(session, inst.id, ['admin', 'docente'])) redirect('/dashboard')

  const { data: evaluacion } = await supabase
    .from('evaluaciones')
    .select('id, nombre, tipo, peso, periodo_id, fecha, template_id, permite_recuperatorio, recuperatorio_de_evaluacion_id, materias(id, materias_catalogo(nombre), cursos(id, nombre)), evaluacion_dimensiones(dimension_id, materias_dimensiones(id, nombre, tipo))')
    .eq('id', evaluacion_id)
    .single()

  if (!evaluacion) notFound()

  const mat = evaluacion.materias as {
    id: string
    materias_catalogo: { nombre: string } | null
    cursos: { id: string; nombre: string } | null
  } | null
  if (!mat) notFound()

  const materiaNombre = mat.materias_catalogo?.nombre ?? ''
  const cursoId = mat.cursos?.id ?? ''

  const isAdminLevel = isSuperadmin(session) || hasRole(session, inst.id, 'admin')

  // Fetch periodos for the edit sheet (need año_lectivo_id from curso)
  const { data: cursoData } = await supabase
    .from('cursos')
    .select('*')
    .eq('id', cursoId)
    .single()

  const { data: periodos } = cursoData?.año_lectivo_id
    ? await supabase
        .from('periodos')
        .select('id, nombre, activo, cerrado_at')
        .eq('año_lectivo_id', cursoData.año_lectivo_id)
        .is('deleted_at', null)
        .order('orden')
    : { data: [] }

  const { data: todasDimensiones } = await supabase
    .from('materias_dimensiones')
    .select('id, nombre, tipo')
    .eq('materia_id', mat.id)
    .order('orden')

  const { data: instData } = await supabase
    .from('instituciones')
    .select('nota_aprobacion')
    .eq('id', inst.id)
    .single()

  const permiteRecuperatorio = !!evaluacion.permite_recuperatorio
  const esRecuperatorio = !!evaluacion.recuperatorio_de_evaluacion_id

  const { data: recuperatorioExistente } = permiteRecuperatorio
    ? await supabase
        .from('evaluaciones')
        .select('id')
        .eq('recuperatorio_de_evaluacion_id', evaluacion_id)
        .is('deleted_at', null)
        .maybeSingle()
    : { data: null }

  // Fetch students enrolled in this course (via inscripciones)
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
    .from('notas')
    .select('id, alumno_id, dimension_id, valor_numerico, valor_literal, observacion')
    .eq('evaluacion_id', evaluacion_id)
    .is('deleted_at', null)

  type DimEntry = { id: string; nombre: string; tipo: string }
  const rawDims = (evaluacion.evaluacion_dimensiones ?? []) as Array<{ dimension_id: string; materias_dimensiones: { id: string; nombre: string; tipo: string } | null }>
  const dimensiones: DimEntry[] = rawDims
    .filter(d => d.materias_dimensiones)
    .map(d => ({ id: d.materias_dimensiones!.id, nombre: d.materias_dimensiones!.nombre, tipo: d.materias_dimensiones!.tipo }))

  const notaAprobacion = instData?.nota_aprobacion ?? null
  const evalPeriodo = (periodos ?? []).find(p => p.id === (evaluacion.periodo_id ?? ''))
  const isCerrado = !!(evalPeriodo?.cerrado_at)

  const { data: escala } = await supabase
    .from('escalas')
    .select('min_valor, max_valor')
    .eq('institucion_id', inst.id)
    .eq('activa', true)
    .maybeSingle()

  // For recuperatorios: compute which (alumno, dim) pairs are eligible (failed original)
  // eligibles: Map<alumno_id, Set<dim_id | '__none__'>>
  //   '__none__' = no-dimension evaluacion
  //   null key not used in Map — use '__none__' sentinel
  let eligibles: Map<string, Set<string>> | null = null

  const recuperatorio_de_id = evaluacion.recuperatorio_de_evaluacion_id ?? null

  if (esRecuperatorio && recuperatorio_de_id && notaAprobacion !== null) {
    const { data: notasOriginales } = await supabase
      .from('notas')
      .select('alumno_id, dimension_id, valor_numerico, valor_literal')
      .eq('evaluacion_id', recuperatorio_de_id)
      .is('deleted_at', null)

    eligibles = new Map<string, Set<string>>()

    const hasDims = dimensiones.length > 0

    if (hasDims) {
      // Per (alumno, dim): eligible if nota < aprobacion OR ausente OR sin nota
      const notasMap = new Map<string, { valor_numerico: number | null; valor_literal: string | null }>()
      for (const n of notasOriginales ?? []) {
        notasMap.set(`${n.alumno_id}:${n.dimension_id ?? '__none__'}`, {
          valor_numerico: n.valor_numerico,
          valor_literal: n.valor_literal,
        })
      }

      for (const alumno of alumnos ?? []) {
        const dimsFailed = new Set<string>()
        for (const dim of dimensiones) {
          const nota = notasMap.get(`${alumno.id}:${dim.id}`)
          const fallo = !nota || nota.valor_literal === 'A' ||
            (nota.valor_numerico !== null && nota.valor_numerico < notaAprobacion)
          if (fallo) dimsFailed.add(dim.id)
        }
        if (dimsFailed.size > 0) eligibles.set(alumno.id, dimsFailed)
      }
    } else {
      // No dimensions: eligible if nota < aprobacion OR ausente OR sin nota
      const notasMap = new Map<string, { valor_numerico: number | null; valor_literal: string | null }>()
      for (const n of notasOriginales ?? []) {
        notasMap.set(n.alumno_id, { valor_numerico: n.valor_numerico, valor_literal: n.valor_literal })
      }

      for (const alumno of alumnos ?? []) {
        const nota = notasMap.get(alumno.id)
        const fallo = !nota || nota.valor_literal === 'A' ||
          (nota.valor_numerico !== null && nota.valor_numerico < notaAprobacion)
        if (fallo) eligibles.set(alumno.id, new Set(['__none__']))
      }
    }
  }

  const evalForSheet = {
    id: evaluacion_id,
    nombre: evaluacion.nombre,
    tipo: evaluacion.tipo,
    periodo_id: evaluacion.periodo_id ?? null,
    fecha: evaluacion.fecha ?? null,
    template_id: evaluacion.template_id ?? null,
    permite_recuperatorio: permiteRecuperatorio,
    dimension_ids: dimensiones.map(d => d.id),
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="sticky top-0 z-10 bg-background border-b -mx-6 px-6 py-3">
        {backUrl && (
          <Link href={backUrl} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-1.5">
            <ChevronLeft className="size-4" />
            Cuaderno
          </Link>
        )}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-0.5">
              <span>{mat.cursos?.nombre}</span>
              <span>/</span>
              <span>{materiaNombre}</span>
            </div>
            <h1 className="text-2xl font-semibold">{evaluacion.nombre}</h1>
            <p className="text-sm text-muted-foreground capitalize">{evaluacion.tipo}</p>
          </div>
          <div className="pt-1">
            <EditarEvaluacionSheet
              evaluacion={evalForSheet}
              periodos={periodos ?? []}
              dimensiones={todasDimensiones ?? []}
              isAdmin={isAdminLevel}
              showLabel
            />
          </div>
        </div>
      </div>

      <NotasEditor
        evaluacionId={evaluacion_id}
        evaluacionNombre={evaluacion.nombre}
        alumnos={alumnos ?? []}
        notasExistentes={notasExistentes ?? []}
        dimensiones={dimensiones}
        slug={slug}
        notaAprobacion={notaAprobacion}
        permiteRecuperatorio={permiteRecuperatorio}
        recuperatorioId={recuperatorioExistente?.id ?? null}
        esRecuperatorio={esRecuperatorio}
        eligibles={eligibles}
        escalaMin={escala?.min_valor ?? null}
        escalaMax={escala?.max_valor ?? null}
        isCerrado={isCerrado}
      />
    </div>
  )
}
