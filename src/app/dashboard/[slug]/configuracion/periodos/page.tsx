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
    .select('id, nombre, activo, fecha_inicio, fecha_fin, periodos(id, nombre, orden)')
    .eq('institucion_id', inst.id)
    .is('deleted_at', null)
    .order('nombre', { ascending: false })

  type Periodo = { id: string; nombre: string; orden: number }
  type Año = NonNullable<typeof años>[number]

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
            const periodos = ((año.periodos ?? []) as Periodo[]).sort((a, b) => a.orden - b.orden)
            return (
              <Card key={año.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      {año.nombre}
                      {año.activo && <Badge>Activo</Badge>}
                    </CardTitle>
                    <div className="flex items-center gap-1">
                      {!año.activo && <ActivarAñoButton añoId={año.id} />}
                      {!año.activo && <EliminarAñoButton añoId={año.id} añoNombre={año.nombre} />}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {periodos.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {periodos.map(p => (
                        <Badge key={p.id} variant="secondary">{p.nombre}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Sin períodos definidos.</p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
