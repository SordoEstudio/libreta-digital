import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GraduationCap, Users, BookOpen, AlertTriangle, CheckCircle2, LayoutGrid } from 'lucide-react'
import Link from 'next/link'
import { ConflictosAlert } from './conflictos-alert'
import { detectConflicts, colorIndex } from '@/lib/horario-conflicts'
import type { HorarioEvento } from '@/lib/horario-conflicts'

interface Props {
  instId: string
  slug: string
  instNombre: string
  instTipo: string | null
}

export default async function HomeAdmin({ instId, slug, instNombre, instTipo }: Props) {
  const supabase = await createClient()
  const admin = createAdminClient()

  const [alumnosActivosRes, docentesRes, añoActivoRes] = await Promise.all([
    admin.from('alumnos').select('id').eq('institucion_id', instId).eq('activo', true).is('deleted_at', null),
    admin.from('memberships').select('id', { count: 'exact', head: true }).eq('institucion_id', instId).eq('rol', 'docente').eq('activo', true),
    supabase.from('años_lectivos').select('id, nombre').eq('institucion_id', instId).eq('activo', true).is('deleted_at', null).maybeSingle(),
  ])

  const alumnosActivos = alumnosActivosRes.data ?? []
  const docentesCount = docentesRes.count ?? 0
  const añoActivo = añoActivoRes.data
  const alumnoIds = alumnosActivos.map(a => a.id)

  const [cursosRes, inscripcionesRes] = await Promise.all([
    añoActivo
      ? supabase.from('cursos').select('id, nombre').eq('año_lectivo_id', añoActivo.id).is('deleted_at', null)
      : Promise.resolve({ data: [] as { id: string; nombre: string }[] }),
    alumnoIds.length > 0
      ? admin.from('alumno_inscripciones').select('alumno_id').in('alumno_id', alumnoIds).eq('activo', true).is('deleted_at', null)
      : Promise.resolve({ data: [] as { alumno_id: string }[] }),
  ])

  const cursosDelAño = cursosRes.data ?? []
  const cursosCount = cursosDelAño.length
  const cursoIds = cursosDelAño.map(c => c.id)
  const cursoNombreMap = new Map(cursosDelAño.map(c => [c.id, c.nombre]))

  type DocenteEntry = { persona_id: string; personas: { nombre: string } | null }
  type HorarioEntry = { id: string; dia_semana: number; hora_inicio: string; hora_fin: string; aula: string | null; deleted_at: string | null }
  type MateriaRow = {
    id: string
    curso_id: string
    materias_catalogo: { nombre: string } | null
    materia_docentes: DocenteEntry[]
    materia_horarios: HorarioEntry[]
  }

  const { data: materiasDelAño } = cursoIds.length > 0
    ? await admin.from('materias')
        .select('id, curso_id, materias_catalogo(nombre), materia_docentes(persona_id, personas(nombre)), materia_horarios(id, dia_semana, hora_inicio, hora_fin, aula, deleted_at)')
        .in('curso_id', cursoIds)
        .is('deleted_at', null)
    : { data: [] as MateriaRow[] }

  const materias = (materiasDelAño as unknown as MateriaRow[]) ?? []

  const conCurso = new Set((inscripcionesRes.data ?? []).map(i => i.alumno_id))
  const alumnosSinCurso = alumnosActivos.filter(a => !conCurso.has(a.id)).length
  const materiasSinDocente = materias.filter(m => m.materia_docentes.length === 0).length

  // Construir HorarioEvento[] para detectar conflictos
  const horariosParaConflictos: HorarioEvento[] = []
  for (const m of materias) {
    const docente = m.materia_docentes[0] ?? null
    for (const h of m.materia_horarios) {
      if (h.deleted_at) continue
      horariosParaConflictos.push({
        id: h.id,
        materiaId: m.id,
        materiaNombre: m.materias_catalogo?.nombre ?? '',
        cursoId: m.curso_id,
        cursoNombre: cursoNombreMap.get(m.curso_id) ?? '',
        docenteId: docente?.persona_id ?? null,
        docenteNombre: (docente?.personas as { nombre: string } | null)?.nombre ?? null,
        dia_semana: h.dia_semana,
        hora_inicio: h.hora_inicio,
        hora_fin: h.hora_fin,
        aula: h.aula,
        colorIndex: colorIndex(m.id),
      })
    }
  }
  const conflictos = detectConflicts(horariosParaConflictos)

  const alerts = [
    alumnosSinCurso > 0 && {
      label: `${alumnosSinCurso} alumno${alumnosSinCurso !== 1 ? 's' : ''} sin curso`,
      href: `/dashboard/${slug}/alumnos`,
      linkLabel: 'Ver alumnos',
    },
    materiasSinDocente > 0 && {
      label: `${materiasSinDocente} materia${materiasSinDocente !== 1 ? 's' : ''} sin docente asignado`,
      href: `/dashboard/${slug}/cursos`,
      linkLabel: 'Ver cursos',
    },
  ].filter(Boolean) as Array<{ label: string; href: string; linkLabel: string }>

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{instNombre}</h1>
        <p className="text-sm text-muted-foreground">{instTipo ?? 'Institución educativa'}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alumnos activos</CardTitle>
            <GraduationCap className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{alumnosActivos.length.toLocaleString('es')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Docentes activos</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{docentesCount.toLocaleString('es')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {añoActivo ? `Cursos · ${añoActivo.nombre}` : 'Cursos'}
            </CardTitle>
            <BookOpen className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{cursosCount.toLocaleString('es')}</p>
          </CardContent>
        </Card>
      </div>

      {(alerts.length > 0 || conflictos.length > 0) ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Requiere atención</p>
          <div className="flex flex-col gap-2">
            {conflictos.length > 0 && (
              <ConflictosAlert conflictos={conflictos} slug={slug} />
            )}
            {alerts.map(alert => (
              <div key={alert.href} className="flex items-center justify-between gap-3 rounded-lg border border-warning-border bg-warning-muted px-4 py-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="size-4 shrink-0 text-warning" />
                  <span className="text-sm">{alert.label}</span>
                </div>
                <Button variant="ghost" size="sm" className="h-7 shrink-0 text-xs" render={<Link href={alert.href} />}>
                  {alert.linkLabel} →
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : alumnosActivos.length > 0 ? (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-4 py-3">
          <CheckCircle2 className="size-4 shrink-0 text-green-600" />
          <span className="text-sm text-muted-foreground">Todo en orden</span>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Accesos rápidos</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" render={<Link href={`/dashboard/${slug}/cursos`} />}>
            <LayoutGrid data-icon="inline-start" />
            Cursos
          </Button>
          <Button variant="secondary" size="sm" render={<Link href={`/dashboard/${slug}/alumnos`} />}>
            <GraduationCap data-icon="inline-start" />
            Alumnos
          </Button>
          <Button variant="secondary" size="sm" render={<Link href={`/dashboard/${slug}/usuarios`} />}>
            <Users data-icon="inline-start" />
            Usuarios
          </Button>
        </div>
      </div>
    </div>
  )
}
