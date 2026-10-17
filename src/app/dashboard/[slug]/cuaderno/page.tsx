import { requireSession, isSuperadmin, hasAnyRole, hasRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { NotebookPen } from 'lucide-react'
import CuadernoSelectores from './cuaderno-selectores'
import CuadernoTabla from './cuaderno-tabla'
import CuadernoNuevaInstanciaBtn from './cuaderno-nueva-instancia-btn'
import CuadernoUnidadesSheet from './cuaderno-unidades-sheet'

type Params = { params: Promise<{ slug: string }>; searchParams: Promise<{ materia_id?: string; periodo_id?: string }> }

export default async function CuadernoPage({ params, searchParams }: Params) {
  const { slug } = await params
  const { materia_id, periodo_id } = await searchParams
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

  // Fetch materias accessible by this user
  let materiasQuery = supabase
    .from('materias')
    .select('id, materias_catalogo(nombre), cursos(id, nombre)')
    .eq('institucion_id', inst.id)
    .is('deleted_at', null)
    .order('id')

  if (!isAdminLevel && session.persona_id) {
    // Docente: only their assigned materias
    const { data: assignments } = await supabase
      .from('materia_docentes')
      .select('materia_id')
      .eq('persona_id', session.persona_id)
    const ids = (assignments ?? []).map(a => a.materia_id)
    if (ids.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
          <NotebookPen className="size-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">No tenés materias asignadas.</p>
        </div>
      )
    }
    materiasQuery = materiasQuery.in('id', ids)
  }

  const { data: materiasRaw } = await materiasQuery

  type MateriaRaw = {
    id: string
    materias_catalogo: { nombre: string } | null
    cursos: { id: string; nombre: string } | null
  }

  const materias = (materiasRaw ?? []).map((m: MateriaRaw) => ({
    id: m.id,
    nombre: (m.materias_catalogo as { nombre: string } | null)?.nombre ?? '(sin nombre)',
    cursoNombre: m.cursos?.nombre ?? '',
    cursoId: m.cursos?.id ?? '',
    añoLectivoId: null as string | null,
  }))

  // Resolve selected materia — default to first materia when no param
  const selectedMateria = materia_id
    ? materias.find(m => m.id === materia_id)
    : (materias[0] ?? null)

  // Fetch año_lectivo_id for the selected materia's curso (separate query to avoid ñ parser issue)
  type Periodo = { id: string; nombre: string; orden: number; activo: boolean | null; cerrado_at: string | null }
  let periodos: Periodo[] = []
  if (selectedMateria?.cursoId) {
    const { data: cursoData } = await supabase
      .from('cursos')
      .select('*')
      .eq('id', selectedMateria.cursoId)
      .single()
    if (cursoData?.año_lectivo_id) {
      const { data: periodoRows } = await supabase
        .from('periodos')
        .select('id, nombre, orden, activo, cerrado_at')
        .eq('año_lectivo_id', cursoData.año_lectivo_id)
        .order('orden')
      periodos = (periodoRows ?? []) as Periodo[]
    }
  }

  // Default to active period when no param
  const defaultPeriodo = periodos.find(p => p.activo) ?? periodos[0] ?? null
  const selectedPeriodo = periodo_id
    ? periodos.find(p => p.id === periodo_id)
    : defaultPeriodo

  const periodoCerrado = selectedPeriodo
    ? selectedPeriodo.cerrado_at != null
    : false

  // Fetch unidades for the selected materia
  type Unidad = { id: string; nombre: string; orden: number; fecha_inicio: string | null; fecha_fin: string | null }
  const { data: unidadesRaw } = selectedMateria
    ? await supabase
        .from('unidades')
        .select('id, nombre, orden, fecha_inicio, fecha_fin')
        .eq('materia_id', selectedMateria.id)
        .is('deleted_at', null)
        .order('orden')
    : { data: [] }
  const unidades = (unidadesRaw ?? []) as Unidad[]

  // Only fetch table data when both materia + periodo selected
  let tableData: {
    alumnos: Array<{ id: string; nombre: string; apellido: string | null }>
    evalRefs: Array<{
      id: string
      nombre: string
      tipo: 'numerica' | 'conceptual'
      periodoId: string | null
      dimensionIds: string[]
      unidadIds: string[]
      dimensiones: Array<{ id: string; nombre: string; orden: number }>
      notasMap: Record<string, string>
    }>
    notaDefinitivaEvalId: string | null
    notaDefinitivaMap: Record<string, string>
    allMaterialDims: Array<{ id: string; nombre: string; orden: number }>
    periodoCerrado: boolean
  } | null = null

  if (selectedMateria && selectedPeriodo) {
    // Alumnos inscriptos en el curso
    const { data: inscripciones } = await supabase
      .from('alumno_inscripciones')
      .select('alumno_id')
      .eq('curso_id', selectedMateria.cursoId)
      .eq('activo', true)
      .is('deleted_at', null)

    const alumnoIds = (inscripciones ?? []).map(i => i.alumno_id)

    const { data: alumnosRaw } = alumnoIds.length > 0
      ? await supabase
          .from('alumnos')
          .select('id, nombre, apellido')
          .in('id', alumnoIds)
          .eq('activo', true)
          .is('deleted_at', null)
      : { data: [] }

    const alumnos = alumnosRaw ?? []

    // Dimensiones de la materia
    const { data: dimRows } = await supabase
      .from('materias_dimensiones')
      .select('id, nombre, orden')
      .eq('materia_id', selectedMateria.id)
      .is('deleted_at', null)
      .order('orden')

    const allMaterialDims = (dimRows ?? []) as Array<{ id: string; nombre: string; orden: number }>
    const dimMap = new Map(allMaterialDims.map(d => [d.id, d]))

    // Eval refs for this materia + period
    const { data: evalRefsRaw } = await supabase
      .from('evaluaciones_referencia')
      .select('id, nombre, tipo, periodo_id, evaluacion_referencia_dimensiones(dimension_id), evaluacion_referencia_unidades(unidad_id)')
      .eq('materia_id', selectedMateria.id)
      .eq('periodo_id', selectedPeriodo.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })

    type EvalRefRaw = {
      id: string
      nombre: string
      tipo: string
      periodo_id: string | null
      evaluacion_referencia_dimensiones: Array<{ dimension_id: string }>
      evaluacion_referencia_unidades: Array<{ unidad_id: string }>
    }

    const evalRefIds = (evalRefsRaw ?? []).map((ev: EvalRefRaw) => ev.id)

    // Notas referencia for all these eval refs
    let notasRefRaw: Array<{ evaluacion_ref_id: string; alumno_id: string; dimension_id: string | null; valor_numerico: number | null; valor_literal: string | null }> = []
    if (evalRefIds.length > 0) {
      const { data: nr } = await supabase
        .from('notas_referencia')
        .select('evaluacion_ref_id, alumno_id, dimension_id, valor_numerico, valor_literal')
        .in('evaluacion_ref_id', evalRefIds)
      notasRefRaw = (nr ?? [])
    }

    // Build notasMap per eval ref
    const notasByRef = new Map<string, Record<string, string>>()
    for (const n of notasRefRaw) {
      if (!notasByRef.has(n.evaluacion_ref_id)) notasByRef.set(n.evaluacion_ref_id, {})
      const key = `${n.alumno_id}::${n.dimension_id ?? '__'}`
      notasByRef.get(n.evaluacion_ref_id)![key] = n.valor_numerico?.toString() ?? n.valor_literal ?? ''
    }

    const evalRefs = (evalRefsRaw ?? []).map((ev: EvalRefRaw) => {
      const resolvedDims = ev.evaluacion_referencia_dimensiones
        .map(d => dimMap.get(d.dimension_id))
        .filter((d): d is { id: string; nombre: string; orden: number } => d !== null && d !== undefined)
        .sort((a, b) => a.orden - b.orden)

      return {
        id: ev.id,
        nombre: ev.nombre,
        tipo: ev.tipo as 'numerica' | 'conceptual',
        periodoId: ev.periodo_id ?? null,
        dimensionIds: ev.evaluacion_referencia_dimensiones.map(d => d.dimension_id),
        unidadIds: ev.evaluacion_referencia_unidades.map(u => u.unidad_id),
        dimensiones: resolvedDims,
        notasMap: notasByRef.get(ev.id) ?? {},
      }
    })

    // Nota definitiva del período
    const { data: definitivas } = await supabase
      .from('evaluaciones')
      .select('id, notas(alumno_id, valor_numerico, valor_literal)')
      .eq('materia_id', selectedMateria.id)
      .eq('periodo_id', selectedPeriodo.id)
      .eq('es_definitiva_periodo', true)
      .is('deleted_at', null)
      .limit(1)

    type NotaRow = { alumno_id: string; valor_numerico: number | null; valor_literal: string | null }
    type DefinitivaRow = { id: string; notas: NotaRow[] }

    const definitiva = (definitivas as DefinitivaRow[] | null)?.[0] ?? null
    const notaDefinitivaMap: Record<string, string> = {}
    for (const n of (definitiva?.notas ?? [])) {
      notaDefinitivaMap[n.alumno_id] = n.valor_numerico?.toString() ?? n.valor_literal ?? ''
    }

    tableData = {
      alumnos,
      evalRefs,
      notaDefinitivaEvalId: definitiva?.id ?? null,
      notaDefinitivaMap,
      allMaterialDims,
      periodoCerrado,
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Cuaderno del docente</h1>
        <p className="text-sm text-muted-foreground">Vista unificada de seguimiento y nota definitiva por período</p>
      </div>

      <CuadernoSelectores
        slug={slug}
        materias={materias.map(m => ({ id: m.id, nombre: m.nombre, cursoNombre: m.cursoNombre }))}
        periodos={periodos.map(p => ({ id: p.id, nombre: p.nombre }))}
        selectedMateriaId={selectedMateria?.id ?? null}
        selectedPeriodoId={selectedPeriodo?.id ?? null}
      />

      {!selectedMateria && (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <NotebookPen className="size-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">Seleccioná una materia para comenzar.</p>
        </div>
      )}

      {selectedMateria && !selectedPeriodo && (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <NotebookPen className="size-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">
            {periodos.length === 0
              ? 'Esta materia no tiene períodos configurados.'
              : 'Seleccioná un período para ver el cuaderno.'}
          </p>
        </div>
      )}

      {tableData && selectedPeriodo && (
        <>
          <div className="flex justify-end gap-2">
            <CuadernoUnidadesSheet
              materiaId={selectedMateria!.id}
              unidades={unidades.map(u => ({
                id: u.id,
                nombre: u.nombre,
                orden: u.orden,
                fechaInicio: u.fecha_inicio,
                fechaFin: u.fecha_fin,
              }))}
            />
            <CuadernoNuevaInstanciaBtn
              materiaId={selectedMateria!.id}
              periodos={periodos}
              dimensiones={tableData.allMaterialDims}
              unidades={unidades.map(u => ({
                id: u.id,
                nombre: u.nombre,
                orden: u.orden,
                fecha_inicio: u.fecha_inicio,
                fecha_fin: u.fecha_fin,
              }))}
            />
          </div>

          <CuadernoTabla
            alumnos={tableData.alumnos}
            evalRefs={tableData.evalRefs}
            notaDefinitivaEvalId={tableData.notaDefinitivaEvalId}
            notaDefinitivaMap={tableData.notaDefinitivaMap}
            materiaId={selectedMateria!.id}
            periodoId={selectedPeriodo.id}
            periodoNombre={selectedPeriodo.nombre}
            periodos={periodos}
            todasDimensiones={tableData.allMaterialDims}
            todasUnidades={unidades.map(u => ({ id: u.id, nombre: u.nombre }))}
            periodoCerrado={tableData.periodoCerrado}
          />
        </>
      )}
    </div>
  )
}
