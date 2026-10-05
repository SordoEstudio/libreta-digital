import { requireSession, isSuperadmin, hasAnyRole, hasRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar, Clock } from 'lucide-react'
import HorarioSemanal from './horario-semanal'
import CalendarioEvaluaciones from './calendario-evaluaciones'
import IcalButton from './ical-button'

export type HorarioEvento = {
  id: string
  materiaNombre: string
  cursoNombre: string
  dia_semana: number
  hora_inicio: string
  hora_fin: string
  aula: string | null
  colorIndex: number
}

export type EvaluacionEvento = {
  id: string
  nombre: string
  tipo: string
  materiaNombre: string
  cursoNombre: string
  fecha: string
  colorIndex: number
}

function colorIndex(id: string): number {
  let hash = 0
  for (const c of id) hash = (hash << 5) - hash + c.charCodeAt(0)
  return Math.abs(hash) % 8
}

type Params = { params: Promise<{ slug: string }> }

export default async function CalendarioPage({ params }: Params) {
  const { slug } = await params
  const session = await requireSession()
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: inst } = await supabase
    .from('instituciones')
    .select('id, nombre')
    .eq('slug', slug)
    .is('deleted_at', null)
    .single()

  if (!inst) {
    if (isSuperadmin(session)) redirect('/dashboard/instituciones')
    notFound()
  }
  if (!isSuperadmin(session) && !hasAnyRole(session, inst.id, ['admin', 'docente', 'responsable']))
    redirect('/dashboard')

  const isAdminLevel = isSuperadmin(session) || hasRole(session, inst.id, 'admin')
  const isDocente = !isAdminLevel && hasRole(session, inst.id, 'docente')
  const isResponsable = !isAdminLevel && !isDocente && hasRole(session, inst.id, 'responsable')

  const horarios: HorarioEvento[] = []
  const evaluaciones: EvaluacionEvento[] = []

  if (isAdminLevel) {
    const { data: año } = await supabase
      .from('años_lectivos')
      .select('id')
      .eq('institucion_id', inst.id)
      .eq('activo', true)
      .is('deleted_at', null)
      .maybeSingle()

    if (año) {
      const { data: cursos } = await admin
        .from('cursos')
        .select('id, nombre')
        .eq('año_lectivo_id', año.id)
        .is('deleted_at', null)

      const cursoIds = (cursos ?? []).map(c => c.id)
      const cursoNombreMap = new Map((cursos ?? []).map(c => [c.id, c.nombre]))

      if (cursoIds.length > 0) {
        const { data: materias } = await admin
          .from('materias')
          .select('id, curso_id, materias_catalogo(nombre)')
          .in('curso_id', cursoIds)
          .is('deleted_at', null)

        type MatCatalogo = { nombre: string }
        const materiaIds = (materias ?? []).map(m => m.id)
        const materiaNombreMap = new Map(
          (materias ?? []).map(m => [m.id, {
            nombre: (m.materias_catalogo as MatCatalogo | null)?.nombre ?? '',
            cursoId: m.curso_id,
          }])
        )

        if (materiaIds.length > 0) {
          const [horariosRes, evaluacionesRes] = await Promise.all([
            admin.from('materia_horarios')
              .select('id, materia_id, dia_semana, hora_inicio, hora_fin, aula')
              .in('materia_id', materiaIds).is('deleted_at', null),
            admin.from('evaluaciones')
              .select('id, materia_id, nombre, tipo, fecha')
              .in('materia_id', materiaIds).is('deleted_at', null).not('fecha', 'is', null),
          ])

          for (const h of horariosRes.data ?? []) {
            const mat = materiaNombreMap.get(h.materia_id)
            if (!mat) continue
            horarios.push({
              id: h.id,
              materiaNombre: mat.nombre,
              cursoNombre: cursoNombreMap.get(mat.cursoId) ?? '',
              dia_semana: h.dia_semana,
              hora_inicio: h.hora_inicio,
              hora_fin: h.hora_fin,
              aula: h.aula,
              colorIndex: colorIndex(h.materia_id),
            })
          }
          for (const e of evaluacionesRes.data ?? []) {
            if (!e.fecha) continue
            const mat = materiaNombreMap.get(e.materia_id)
            if (!mat) continue
            evaluaciones.push({
              id: e.id,
              nombre: e.nombre,
              tipo: e.tipo,
              materiaNombre: mat.nombre,
              cursoNombre: cursoNombreMap.get(mat.cursoId) ?? '',
              fecha: e.fecha,
              colorIndex: colorIndex(e.materia_id),
            })
          }
        }
      }
    }
  } else if (isDocente && session.persona_id) {
    const { data: docenteMaterias } = await admin
      .from('materia_docentes')
      .select('materia_id')
      .eq('persona_id', session.persona_id)

    const materiaIds = (docenteMaterias ?? []).map(dm => dm.materia_id)

    if (materiaIds.length > 0) {
      type CursoRaw = { nombre: string }
      type CatalogoRaw = { nombre: string }
      const { data: materias } = await admin
        .from('materias')
        .select('id, materias_catalogo(nombre), cursos(nombre)')
        .in('id', materiaIds)
        .eq('institucion_id', inst.id)
        .is('deleted_at', null)

      const materiaNombreMap = new Map(
        (materias ?? []).map(m => [m.id, {
          nombre: (m.materias_catalogo as CatalogoRaw | null)?.nombre ?? '',
          cursoNombre: (m.cursos as CursoRaw | null)?.nombre ?? '',
        }])
      )

      const [horariosRes, evaluacionesRes] = await Promise.all([
        admin.from('materia_horarios')
          .select('id, materia_id, dia_semana, hora_inicio, hora_fin, aula')
          .in('materia_id', materiaIds).is('deleted_at', null),
        admin.from('evaluaciones')
          .select('id, materia_id, nombre, tipo, fecha')
          .in('materia_id', materiaIds).is('deleted_at', null).not('fecha', 'is', null),
      ])

      for (const h of horariosRes.data ?? []) {
        const mat = materiaNombreMap.get(h.materia_id)
        if (!mat) continue
        horarios.push({
          id: h.id,
          materiaNombre: mat.nombre,
          cursoNombre: mat.cursoNombre,
          dia_semana: h.dia_semana,
          hora_inicio: h.hora_inicio,
          hora_fin: h.hora_fin,
          aula: h.aula,
          colorIndex: colorIndex(h.materia_id),
        })
      }
      for (const e of evaluacionesRes.data ?? []) {
        if (!e.fecha) continue
        const mat = materiaNombreMap.get(e.materia_id)
        if (!mat) continue
        evaluaciones.push({
          id: e.id,
          nombre: e.nombre,
          tipo: e.tipo,
          materiaNombre: mat.nombre,
          cursoNombre: mat.cursoNombre,
          fecha: e.fecha,
          colorIndex: colorIndex(e.materia_id),
        })
      }
    }
  } else if (isResponsable && session.persona_id) {
    const { data: respAlumnos } = await admin
      .from('alumno_responsables')
      .select('alumno_id')
      .eq('persona_id', session.persona_id)

    const alumnoIds = (respAlumnos ?? []).map(r => r.alumno_id)

    if (alumnoIds.length > 0) {
      type CursoRaw = { nombre: string }
      const { data: inscripciones } = await admin
        .from('alumno_inscripciones')
        .select('curso_id, cursos(nombre)')
        .in('alumno_id', alumnoIds)
        .eq('activo', true)
        .is('deleted_at', null)

      const cursoIds = [...new Set((inscripciones ?? []).map(i => i.curso_id))]
      const cursoNombreMap = new Map(
        (inscripciones ?? []).map(i => [
          i.curso_id,
          (i.cursos as CursoRaw | null)?.nombre ?? '',
        ])
      )

      if (cursoIds.length > 0) {
        type CatalogoRaw = { nombre: string }
        const { data: materias } = await admin
          .from('materias')
          .select('id, curso_id, materias_catalogo(nombre)')
          .in('curso_id', cursoIds)
          .is('deleted_at', null)

        const materiaIds = (materias ?? []).map(m => m.id)
        const materiaNombreMap = new Map(
          (materias ?? []).map(m => [m.id, {
            nombre: (m.materias_catalogo as CatalogoRaw | null)?.nombre ?? '',
            cursoId: m.curso_id,
          }])
        )

        if (materiaIds.length > 0) {
          const [horariosRes, evaluacionesRes] = await Promise.all([
            admin.from('materia_horarios')
              .select('id, materia_id, dia_semana, hora_inicio, hora_fin, aula')
              .in('materia_id', materiaIds).is('deleted_at', null),
            admin.from('evaluaciones')
              .select('id, materia_id, nombre, tipo, fecha')
              .in('materia_id', materiaIds).is('deleted_at', null).not('fecha', 'is', null),
          ])

          for (const h of horariosRes.data ?? []) {
            const mat = materiaNombreMap.get(h.materia_id)
            if (!mat) continue
            horarios.push({
              id: h.id,
              materiaNombre: mat.nombre,
              cursoNombre: cursoNombreMap.get(mat.cursoId) ?? '',
              dia_semana: h.dia_semana,
              hora_inicio: h.hora_inicio,
              hora_fin: h.hora_fin,
              aula: h.aula,
              colorIndex: colorIndex(h.materia_id),
            })
          }
          for (const e of evaluacionesRes.data ?? []) {
            if (!e.fecha) continue
            const mat = materiaNombreMap.get(e.materia_id)
            if (!mat) continue
            evaluaciones.push({
              id: e.id,
              nombre: e.nombre,
              tipo: e.tipo,
              materiaNombre: mat.nombre,
              cursoNombre: cursoNombreMap.get(mat.cursoId) ?? '',
              fecha: e.fecha,
              colorIndex: colorIndex(e.materia_id),
            })
          }
        }
      }
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Calendario</h1>
          <p className="text-sm text-muted-foreground">Horarios y evaluaciones</p>
        </div>
        {horarios.length > 0 && (
          <IcalButton horarios={horarios} instNombre={inst.nombre} />
        )}
      </div>

      <Tabs defaultValue="horario">
        <TabsList>
          <TabsTrigger value="horario">
            <Clock className="size-3.5 mr-1.5" />
            Horario semanal
          </TabsTrigger>
          <TabsTrigger value="evaluaciones">
            <Calendar className="size-3.5 mr-1.5" />
            Evaluaciones
          </TabsTrigger>
        </TabsList>

        <TabsContent value="horario" className="mt-4">
          <HorarioSemanal horarios={horarios} />
        </TabsContent>

        <TabsContent value="evaluaciones" className="mt-4">
          <CalendarioEvaluaciones evaluaciones={evaluaciones} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
