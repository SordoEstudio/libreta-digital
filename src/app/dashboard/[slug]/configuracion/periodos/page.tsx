import { requireSession, isSuperadmin, hasRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar } from 'lucide-react'
import Link from 'next/link'
import NuevoAñoSheet from './nuevo-año-sheet'
import ActivarAñoButton from './activar-año-button'
import EliminarAñoButton from './eliminar-año-button'
import CerrarPeriodoSheet from './cerrar-periodo-sheet'
import ReabrirPeriodoButton from './reabrir-periodo-button'
import PublicarPeriodoButton from './publicar-periodo-button'
import DespublicarPeriodoButton from './despublicar-periodo-button'
import NotificarPeriodoDialog from './notificar-periodo-dialog'
import CerrarAñoButton from './cerrar-ano-button'
import PublicarAñoButton from './publicar-ano-button'
import RenombrarPeriodoButton from './renombrar-periodo-button'
import CierreGranularTable from './cierre-granular-table'

type Params = { params: Promise<{ slug: string }> }

export default async function AñosLectivosPage({ params }: Params) {
  const { slug } = await params
  const session = await requireSession()

  const supabase = await createClient()
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
  if (!isSuperadmin(session) && !hasRole(session, inst.id, 'admin')) redirect(`/dashboard/${slug}`)

  const { data: años } = await supabase
    .from('años_lectivos')
    .select('id, nombre, activo, fecha_inicio, fecha_fin, cerrado_at, publicado_at, periodos(id, nombre, orden, activo, cerrado_at, publicado_at, tipo)')
    .eq('institucion_id', inst.id)
    .is('deleted_at', null)
    .order('nombre', { ascending: false })

  type Periodo = { id: string; nombre: string; orden: number; activo: boolean; cerrado_at: string | null; publicado_at: string | null; tipo: string }
  type Año = NonNullable<typeof años>[number] & { cerrado_at: string | null; publicado_at: string | null }
  const isAdmin = isSuperadmin(session) || hasRole(session, inst.id, 'admin')

  // Fetch cursos for all años
  const allAñoIds = (años ?? []).map(a => a.id)
  const { data: todosCursosRaw } = allAñoIds.length > 0
    ? await supabase
        .from('cursos')
        .select('*')
        .in('año_lectivo_id', allAñoIds)
        .is('deleted_at', null)
        .order('nombre')
    : { data: null }
  type CursoRaw = { id: string; nombre: string; año_lectivo_id: string }
  const todosCursos = (todosCursosRaw ?? []).map(c => c as unknown as CursoRaw)

  // Fetch periodo_cierre_cursos for all period IDs
  const allPeriodoIds = (años ?? []).flatMap(a =>
    ((a.periodos ?? []) as Periodo[]).map(p => p.id)
  )
  const { data: cierresCursos } = allPeriodoIds.length > 0
    ? await supabase
        .from('periodo_cierre_cursos')
        .select('periodo_id, curso_id, cerrado_at, publicado_at, abierto_at')
        .in('periodo_id', allPeriodoIds)
    : { data: null }

  // Build lookup: Map<periodo_id, Map<curso_id, override>>
  type Override = { cerrado_at: string | null; publicado_at: string | null; abierto_at: string | null }
  const cierresMap = new Map<string, Map<string, Override>>()
  for (const cc of cierresCursos ?? []) {
    if (!cierresMap.has(cc.periodo_id)) cierresMap.set(cc.periodo_id, new Map())
    cierresMap.get(cc.periodo_id)!.set(cc.curso_id, {
      cerrado_at: cc.cerrado_at,
      publicado_at: cc.publicado_at,
      abierto_at: cc.abierto_at,
    })
  }

  // Build cursosByAño map
  const cursosByAño = new Map<string, CursoRaw[]>()
  for (const c of todosCursos) {
    const arr = cursosByAño.get(c.año_lectivo_id) ?? []
    arr.push(c)
    cursosByAño.set(c.año_lectivo_id, arr)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-muted-foreground mb-1">
            <Link href={`/dashboard/${slug}/configuracion`} className="hover:text-foreground">
              Configuración
            </Link>
            {' / Períodos'}
          </div>
          <h1 className="text-2xl font-semibold">Años lectivos</h1>
          <p className="text-sm text-muted-foreground">{años?.length ?? 0} años</p>
        </div>
        <NuevoAñoSheet instId={inst.id} />
      </div>

      {(!años || años.length === 0) ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <Calendar className="size-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">Sin años lectivos. Creá el primero.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {años.map((año: Año) => {
            const todosLosPeriodos = (año.periodos ?? []) as Periodo[]
            const periodosRegulares = todosLosPeriodos.filter(p => p.tipo !== 'anual').sort((a, b) => a.orden - b.orden)
            const periodoAnual = todosLosPeriodos.find(p => p.tipo === 'anual') ?? null

            const renderPeriodoActions = (p: Periodo, showRename: boolean) => (
              <div key={p.id} className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{p.nombre}</span>
                    {p.activo && <Badge>Activo</Badge>}
                    {p.cerrado_at && <Badge variant="secondary">Cerrado</Badge>}
                    {p.publicado_at && <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">Publicado</Badge>}
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      {!p.cerrado_at && (
                        <CerrarPeriodoSheet instId={inst.id} periodoId={p.id} periodoNombre={p.nombre} />
                      )}
                      {p.cerrado_at && !p.publicado_at && (
                        <>
                          <ReabrirPeriodoButton instId={inst.id} periodoId={p.id} periodoNombre={p.nombre} />
                          <PublicarPeriodoButton instId={inst.id} periodoId={p.id} periodoNombre={p.nombre} />
                        </>
                      )}
                      {p.cerrado_at && p.publicado_at && (
                        <>
                          <ReabrirPeriodoButton instId={inst.id} periodoId={p.id} periodoNombre={p.nombre} />
                          <DespublicarPeriodoButton instId={inst.id} periodoId={p.id} periodoNombre={p.nombre} />
                          <NotificarPeriodoDialog instId={inst.id} periodoId={p.id} periodoNombre={p.nombre} />
                        </>
                      )}
                      {showRename && (
                        <RenombrarPeriodoButton instId={inst.id} periodoId={p.id} periodoNombre={p.nombre} />
                      )}
                    </div>
                  )}
                </div>
                {isAdmin && (
                  <CierreGranularTable
                    instId={inst.id}
                    periodoId={p.id}
                    cursos={(cursosByAño.get(año.id) ?? []).map(c => ({
                      id: c.id,
                      nombre: c.nombre,
                      override: cierresMap.get(p.id)?.get(c.id) ?? null,
                    }))}
                    periodoCerradoAt={p.cerrado_at}
                    periodoPublicadoAt={p.publicado_at}
                    slug={slug}
                  />
                )}
              </div>
            )

            return (
              <Card key={año.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                      {año.nombre}
                      {año.activo && <Badge>Activo</Badge>}
                      {año.cerrado_at && <Badge variant="secondary">Año cerrado</Badge>}
                      {año.publicado_at && <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">Boletín anual publicado</Badge>}
                    </CardTitle>
                    <div className="flex items-center gap-1 flex-wrap">
                      {!año.activo && <ActivarAñoButton añoId={año.id} />}
                      {!año.activo && <EliminarAñoButton añoId={año.id} añoNombre={año.nombre} />}
                      {isAdmin && !año.cerrado_at && (
                        <CerrarAñoButton instId={inst.id} añoId={año.id} añoNombre={año.nombre} />
                      )}
                      {isAdmin && año.cerrado_at && !año.publicado_at && (
                        <PublicarAñoButton instId={inst.id} añoId={año.id} añoNombre={año.nombre} />
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-3">
                    {periodosRegulares.length > 0 ? (
                      periodosRegulares.map(p => renderPeriodoActions(p, true))
                    ) : (
                      <p className="text-sm text-muted-foreground">Sin períodos definidos.</p>
                    )}
                    {periodoAnual && (
                      <>
                        <div className="border-t pt-3 mt-1">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Período anual</p>
                          {renderPeriodoActions(periodoAnual, false)}
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
