import { requireSession, isSuperadmin, hasRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { Layers } from 'lucide-react'
import NuevaPlantillaSheet from './nueva-plantilla-sheet'
import EliminarPlantillaButton from './eliminar-plantilla-button'
import AplicarPlantillaTodas from './aplicar-plantilla-todas-button'

type Props = { params: Promise<{ slug: string }> }

export default async function DimensionPlantillasPage({ params }: Props) {
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

  if (!isSuperadmin(session) && !hasRole(session, inst.id, 'admin')) notFound()

  const { data: plantillas } = await supabase
    .from('dimension_plantillas')
    .select('id, nombre, dimension_plantilla_items(id, nombre, peso, orden)')
    .eq('institucion_id', inst.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  const list = (plantillas ?? []).map(p => ({
    ...p,
    items: ((p.dimension_plantilla_items ?? []) as Array<{ id: string; nombre: string; peso: number | null; orden: number }>)
      .sort((a, b) => a.orden - b.orden),
  }))

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="size-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold">Plantillas de dimensiones</h1>
        </div>
        <NuevaPlantillaSheet instId={inst.id} />
      </div>

      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay plantillas aún. Creá una para poder aplicarla a las materias.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {list.map(p => (
            <div key={p.id} className="flex items-start justify-between rounded-lg border p-4">
              <div className="flex flex-col gap-1">
                <p className="font-medium">{p.nombre}</p>
                <p className="text-sm text-muted-foreground">
                  {p.items.length} dimensión{p.items.length !== 1 ? 'es' : ''}
                  {p.items.length > 0 && ': ' + p.items.map(i => i.peso !== null ? `${i.nombre} (${i.peso}%)` : i.nombre).join(', ')}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <AplicarPlantillaTodas plantillaId={p.id} plantillaNombre={p.nombre} />
                <EliminarPlantillaButton plantillaId={p.id} plantillaNombre={p.nombre} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
