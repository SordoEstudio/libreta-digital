import { requireSession, isSuperadmin, hasAnyRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { BookMarked } from 'lucide-react'

type Params = { params: Promise<{ slug: string; curso_id: string }> }

export default async function ContenidosCursoPage({ params }: Params) {
  const { slug, curso_id } = await params
  const session = await requireSession()

  const supabase = await createClient()
  const { data: inst } = await supabase
    .from('instituciones')
    .select('id, modulo_contenidos')
    .eq('slug', slug)
    .is('deleted_at', null)
    .single()

  if (!inst) {
    if (isSuperadmin(session)) redirect('/dashboard/instituciones')
    notFound()
  }

  if (!inst.modulo_contenidos) notFound()

  const canAccess = isSuperadmin(session) || hasAnyRole(session, inst.id, ['admin', 'docente', 'responsable'])
  if (!canAccess) redirect(`/dashboard/${slug}`)

  const { data: curso } = await supabase
    .from('cursos')
    .select('*')
    .eq('id', curso_id)
    .eq('institucion_id', inst.id)
    .is('deleted_at', null)
    .single()

  if (!curso) notFound()

  // Fetch materias con nombre del catálogo
  const { data: materiasRaw } = await supabase
    .from('materias')
    .select('id, materias_catalogo(nombre)')
    .eq('curso_id', curso_id)
    .eq('institucion_id', inst.id)
    .is('deleted_at', null)

  type MateriaRaw = { id: string; materias_catalogo: { nombre: string } | null }
  const materias = (materiasRaw ?? []) as MateriaRaw[]

  // Count publicado unidades and items per materia
  const materiaIds = materias.map(m => m.id)
  let countMap = new Map<string, { unidades: number; items: number }>()

  if (materiaIds.length > 0) {
    const { data: unidades } = await supabase
      .from('unidades_contenido')
      .select('id, materia_id, publicado')
      .in('materia_id', materiaIds)
      .is('deleted_at', null)

    const unidadesData = unidades ?? []
    const unidadIds = unidadesData.map(u => u.id)

    let itemCount = new Map<string, number>()
    if (unidadIds.length > 0) {
      const { data: items } = await supabase
        .from('contenidos')
        .select('unidad_id, publicado')
        .in('unidad_id', unidadIds)
        .eq('publicado', true)
        .is('deleted_at', null)

      for (const item of items ?? []) {
        itemCount.set(item.unidad_id, (itemCount.get(item.unidad_id) ?? 0) + 1)
      }
    }

    for (const m of materias) {
      const myUnidades = unidadesData.filter(u => u.materia_id === m.id && u.publicado)
      const myItems = myUnidades.reduce((acc, u) => acc + (itemCount.get(u.id) ?? 0), 0)
      countMap.set(m.id, { unidades: myUnidades.length, items: myItems })
    }
  }

  // Redirect if only one materia
  if (materias.length === 1) {
    redirect(`/dashboard/${slug}/contenidos/${curso_id}/${materias[0].id}`)
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <Link href={`/dashboard/${slug}/contenidos`} className="text-sm text-muted-foreground hover:underline">
          ← Contenidos
        </Link>
        <h1 className="text-2xl font-semibold mt-1">{curso.nombre}</h1>
        <p className="text-muted-foreground text-sm">Seleccioná una materia</p>
      </div>

      {materias.length === 0 ? (
        <EmptyState
          icon={BookMarked}
          title="Sin materias"
          description="Este curso no tiene materias registradas."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {materias.map(materia => {
            const counts = countMap.get(materia.id)
            const nombre = materia.materias_catalogo?.nombre ?? 'Materia'
            return (
              <Link key={materia.id} href={`/dashboard/${slug}/contenidos/${curso_id}/${materia.id}`}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                  <CardHeader>
                    <CardTitle className="text-base">{nombre}</CardTitle>
                    {counts && (
                      <CardDescription>
                        {counts.unidades > 0 ? `${counts.unidades} unidad${counts.unidades !== 1 ? 'es' : ''} · ${counts.items} material${counts.items !== 1 ? 'es' : ''}` : 'Sin materiales publicados'}
                      </CardDescription>
                    )}
                  </CardHeader>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
