import { requireSession, isSuperadmin, hasAnyRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import ContenidosEditor from './contenidos-editor'

export type ContenidoItem = {
  id: string
  tipo: 'link' | 'archivo' | 'imagen'
  titulo: string
  url: string | null
  storage_path: string | null
  nota: string | null
  dimension_id: string | null
  orden: number
  publicado: boolean
  signedUrl?: string
}

export type UnidadConItems = {
  id: string
  nombre: string
  descripcion: string | null
  orden: number
  publicado: boolean
  items: ContenidoItem[]
}

type Params = { params: Promise<{ slug: string; curso_id: string; materia_id: string }> }

export default async function ContenidosMateriaPage({ params }: Params) {
  const { slug, curso_id, materia_id } = await params
  const session = await requireSession()

  const supabase = await createClient()

  const { data: inst } = await supabase
    .from('instituciones')
    .select('id, modulo_contenidos')
    .eq('slug', slug)
    .single()

  if (!inst) {
    if (isSuperadmin(session)) redirect('/dashboard/instituciones')
    notFound()
  }

  if (!inst.modulo_contenidos) notFound()

  const isEditor = isSuperadmin(session) || hasAnyRole(session, inst.id, ['admin', 'docente'])
  const canView  = isEditor || hasAnyRole(session, inst.id, ['responsable'])

  if (!canView) redirect(`/dashboard/${slug}`)

  const { data: materia } = await supabase
    .from('materias')
    .select('id, materias_catalogo(nombre)')
    .eq('id', materia_id)
    .eq('institucion_id', inst.id)
    .is('deleted_at', null)
    .single()

  if (!materia) notFound()

  const materiaNombre = (materia.materias_catalogo as { nombre: string } | null)?.nombre ?? 'Materia'

  const unidadesQuery = supabase
    .from('unidades')
    .select('id, nombre, descripcion, orden, publicado')
    .eq('materia_id', materia_id)
    .is('deleted_at', null)
    .order('orden', { ascending: true })

  if (!isEditor) unidadesQuery.eq('publicado', true)

  const { data: unidadesRaw } = await unidadesQuery

  const unidades = unidadesRaw ?? []
  const unidadIds = unidades.map(u => u.id)

  let itemsRaw: ContenidoItem[] = []
  if (unidadIds.length > 0) {
    const { data } = await supabase
      .from('contenidos')
      .select('id, tipo, titulo, url, storage_path, nota, dimension_id, orden, publicado, unidad_id')
      .in('unidad_id', unidadIds)
      .is('deleted_at', null)
      .order('orden', { ascending: true })
    itemsRaw = (data ?? []) as ContenidoItem[]
  }

  // Generate signed URLs server-side for all file items (TTL: 3600s)
  const adminClient = createAdminClient()
  const itemsWithUrls: (ContenidoItem & { unidad_id: string })[] = await Promise.all(
    (itemsRaw as (ContenidoItem & { unidad_id: string })[]).map(async (item) => {
      if (!item.storage_path) return item
      const { data: signed } = await adminClient.storage
        .from('contenidos')
        .createSignedUrl(item.storage_path, 3600)
      return { ...item, signedUrl: signed?.signedUrl ?? undefined }
    })
  )

  const unidadConItems: UnidadConItems[] = unidades.map(u => ({
    id: u.id,
    nombre: u.nombre,
    descripcion: u.descripcion,
    orden: u.orden,
    publicado: u.publicado,
    items: itemsWithUrls.filter(i => i.unidad_id === u.id),
  }))

  const { data: dimensionesRaw } = await supabase
    .from('materias_dimensiones')
    .select('id, nombre')
    .eq('materia_id', materia_id)
    .order('orden', { ascending: true })

  const dimensiones = (dimensionesRaw ?? []) as { id: string; nombre: string }[]

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">{materiaNombre}</h1>
        <p className="text-muted-foreground text-sm">Contenidos</p>
      </div>
      <ContenidosEditor
        unidades={unidadConItems}
        dimensiones={dimensiones}
        materiaId={materia_id}
        slug={slug}
        cursoId={curso_id}
        isEditor={isEditor}
      />
    </div>
  )
}
