import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BookOpen, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface Props {
  instId: string
  slug: string
  personaId: string
}

export default async function HomeDocente({ instId, slug, personaId }: Props) {
  const admin = createAdminClient()

  const { data: docenteMaterias } = await admin
    .from('materia_docentes')
    .select('materia_id')
    .eq('persona_id', personaId)

  const materiaIds = (docenteMaterias ?? []).map(dm => dm.materia_id)

  // Filtrar materias por institución desde el inicio — evita edge case con docentes en múltiples instituciones
  const { data: materias } = materiaIds.length > 0
    ? await admin
        .from('materias')
        .select('id, curso_id, cursos(id, nombre), materias_catalogo(nombre), evaluaciones(id, nombre)')
        .in('id', materiaIds)
        .eq('institucion_id', instId)
        .is('deleted_at', null)
    : { data: [] }

  if (!materias || materias.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold">Inicio</h1>
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <BookOpen className="size-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">Aún no tenés materias asignadas.</p>
        </div>
      </div>
    )
  }

  type CursoRaw = { id: string; nombre: string }
  type CatalogoRaw = { nombre: string }
  type EvalRaw = { id: string; nombre: string }
  type MateriaRaw = {
    id: string
    curso_id: string
    cursos: CursoRaw | null
    materias_catalogo: CatalogoRaw | null
    evaluaciones: EvalRaw[]
  }

  const materiasTyped = (materias ?? []) as unknown as MateriaRaw[]
  const cursoIds = [...new Set(materiasTyped.map(m => m.cursos?.id).filter(Boolean))] as string[]
  const allEvalIds = materiasTyped.flatMap(m => m.evaluaciones.map(e => e.id))

  const [inscripcionesRes, notasRes] = await Promise.all([
    cursoIds.length > 0
      ? admin.from('alumno_inscripciones').select('curso_id').in('curso_id', cursoIds).eq('activo', true).is('deleted_at', null)
      : Promise.resolve({ data: [] as { curso_id: string }[] }),
    allEvalIds.length > 0
      ? admin.from('notas').select('evaluacion_id').in('evaluacion_id', allEvalIds).is('deleted_at', null)
      : Promise.resolve({ data: [] as { evaluacion_id: string }[] }),
  ])

  const alumnosPorCurso = new Map<string, number>()
  for (const i of inscripcionesRes.data ?? []) {
    alumnosPorCurso.set(i.curso_id, (alumnosPorCurso.get(i.curso_id) ?? 0) + 1)
  }

  const notasPorEval = new Map<string, number>()
  for (const n of notasRes.data ?? []) {
    notasPorEval.set(n.evaluacion_id, (notasPorEval.get(n.evaluacion_id) ?? 0) + 1)
  }

  type MateriaDisplay = {
    id: string
    nombre: string
    cursoId: string
    cursoNombre: string
    pendientes: number
    evaluaciones: Array<{ id: string; nombre: string; totalAlumnos: number; notasCount: number }>
  }

  const materiasDisplay: MateriaDisplay[] = materiasTyped.map(m => {
    const totalAlumnos = alumnosPorCurso.get(m.cursos?.id ?? '') ?? 0
    const evaluaciones = m.evaluaciones.map(e => ({
      id: e.id,
      nombre: e.nombre,
      totalAlumnos,
      notasCount: notasPorEval.get(e.id) ?? 0,
    }))
    const pendientes = evaluaciones.reduce((sum, e) => sum + Math.max(0, e.totalAlumnos - e.notasCount), 0)
    return {
      id: m.id,
      nombre: m.materias_catalogo?.nombre ?? '—',
      cursoId: m.cursos?.id ?? '',
      cursoNombre: m.cursos?.nombre ?? '—',
      pendientes,
      evaluaciones,
    }
  }).sort((a, b) => b.pendientes - a.pendientes || a.nombre.localeCompare(b.nombre))

  const totalPendientes = materiasDisplay.reduce((sum, m) => sum + m.pendientes, 0)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Mis materias</h1>
        {totalPendientes > 0 && (
          <Badge variant="destructive">
            {totalPendientes} nota{totalPendientes !== 1 ? 's' : ''} pendiente{totalPendientes !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {materiasDisplay.map(m => (
          <Card key={m.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="text-base">{m.nombre}</CardTitle>
                  <p className="text-sm text-muted-foreground">{m.cursoNombre}</p>
                </div>
                <Button variant="secondary" size="sm" className="shrink-0" render={<Link href={`/dashboard/${slug}/materias/${m.id}/evaluaciones`} />}>
                  Cargar notas
                  <ArrowRight data-icon="inline-end" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {m.evaluaciones.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Sin evaluaciones cargadas.</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {m.evaluaciones.map(e => {
                    const falta = Math.max(0, e.totalAlumnos - e.notasCount)
                    return (
                      <div key={e.id} className="flex items-center justify-between gap-2 text-sm">
                        <span className="text-muted-foreground">{e.nombre}</span>
                        {e.totalAlumnos === 0 ? (
                          <span className="text-xs text-muted-foreground">Sin alumnos</span>
                        ) : falta === 0 ? (
                          <span className="text-xs text-green-600">Completo</span>
                        ) : (
                          <span className="text-xs text-amber-600">{falta} sin nota</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
