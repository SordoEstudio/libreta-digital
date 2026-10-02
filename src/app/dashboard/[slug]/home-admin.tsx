import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GraduationCap, Users, BookOpen, AlertTriangle, CheckCircle2, Settings } from 'lucide-react'
import Link from 'next/link'

interface Props {
  instId: string
  slug: string
  instNombre: string
  instTipo: string | null
}

export default async function HomeAdmin({ instId, slug, instNombre, instTipo }: Props) {
  const supabase = await createClient()
  const admin = createAdminClient()

  const [alumnosActivosRes, docentesRes, añoActivoRes, materiasRes] = await Promise.all([
    admin.from('alumnos').select('id').eq('institucion_id', instId).eq('activo', true).is('deleted_at', null),
    admin.from('memberships').select('id', { count: 'exact', head: true }).eq('institucion_id', instId).eq('rol', 'docente').eq('activo', true),
    supabase.from('años_lectivos').select('id, nombre').eq('institucion_id', instId).eq('activo', true).is('deleted_at', null).maybeSingle(),
    admin.from('materias').select('id').eq('institucion_id', instId).is('deleted_at', null),
  ])

  const alumnosActivos = alumnosActivosRes.data ?? []
  const docentesCount = docentesRes.count ?? 0
  const añoActivo = añoActivoRes.data
  const materiaIds = (materiasRes.data ?? []).map(m => m.id)
  const alumnoIds = alumnosActivos.map(a => a.id)

  const [cursosRes, inscripcionesRes, materiasConDocenteRes] = await Promise.all([
    añoActivo
      ? supabase.from('cursos').select('id', { count: 'exact', head: true }).eq('año_lectivo_id', añoActivo.id).is('deleted_at', null)
      : Promise.resolve({ count: 0 } as { count: number }),
    alumnoIds.length > 0
      ? admin.from('alumno_inscripciones').select('alumno_id').in('alumno_id', alumnoIds).eq('activo', true).is('deleted_at', null)
      : Promise.resolve({ data: [] as { alumno_id: string }[] }),
    materiaIds.length > 0
      ? admin.from('materia_docentes').select('materia_id').in('materia_id', materiaIds)
      : Promise.resolve({ data: [] as { materia_id: string }[] }),
  ])

  const cursosCount = cursosRes.count ?? 0
  const conCurso = new Set((inscripcionesRes.data ?? []).map(i => i.alumno_id))
  const alumnosSinCurso = alumnosActivos.filter(a => !conCurso.has(a.id)).length
  const conDocente = new Set((materiasConDocenteRes.data ?? []).map(m => m.materia_id))
  const materiasSinDocente = materiaIds.filter(id => !conDocente.has(id)).length

  const alerts = [
    alumnosSinCurso > 0 && {
      label: `${alumnosSinCurso} alumno${alumnosSinCurso !== 1 ? 's' : ''} sin curso`,
      href: `/dashboard/${slug}/alumnos`,
      linkLabel: 'Ver alumnos',
    },
    materiasSinDocente > 0 && {
      label: `${materiasSinDocente} materia${materiasSinDocente !== 1 ? 's' : ''} sin docente asignado`,
      href: `/dashboard/${slug}/configuracion`,
      linkLabel: 'Ver configuración',
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

      {alerts.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Requiere atención</p>
          <div className="flex flex-col gap-2">
            {alerts.map(alert => (
              <div key={alert.href} className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/20">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-500" />
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
          <Button variant="outline" size="sm" render={<Link href={`/dashboard/${slug}/alumnos`} />}>
            <GraduationCap data-icon="inline-start" />
            Alumnos
          </Button>
          <Button variant="outline" size="sm" render={<Link href={`/dashboard/${slug}/usuarios`} />}>
            <Users data-icon="inline-start" />
            Usuarios
          </Button>
          <Button variant="outline" size="sm" render={<Link href={`/dashboard/${slug}/configuracion`} />}>
            <Settings data-icon="inline-start" />
            Configuración
          </Button>
        </div>
      </div>
    </div>
  )
}
