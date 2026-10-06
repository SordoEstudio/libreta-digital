import { requireSession, isSuperadmin, hasRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import NuevaMateriaCatalogoSheet from './nueva-materia-catalogo-sheet'
import MateriasTabla from './materias-tabla'

type Params = { params: Promise<{ slug: string }> }

export default async function MateriasCatalogoPage({ params }: Params) {
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

  const { data: catalogo } = await supabase
    .from('materias_catalogo')
    .select('id, nombre')
    .eq('institucion_id', inst.id)
    .is('deleted_at', null)
    .order('nombre')

  // Count active instances per catalog entry, with course names for tooltip
  const { data: instancias } = await supabase
    .from('materias')
    .select('catalogo_id, cursos(nombre)')
    .eq('institucion_id', inst.id)
    .is('deleted_at', null)

  const instanciasPorCatalogo = new Map<string, string[]>()
  for (const m of instancias ?? []) {
    const cursoNombre = (m.cursos as { nombre: string } | null)?.nombre ?? 'Curso sin nombre'
    const existing = instanciasPorCatalogo.get(m.catalogo_id) ?? []
    existing.push(cursoNombre)
    instanciasPorCatalogo.set(m.catalogo_id, existing)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Materias</h1>
          <p className="text-sm text-muted-foreground">{catalogo?.length ?? 0} en el catálogo</p>
        </div>
        <NuevaMateriaCatalogoSheet instId={inst.id} />
      </div>

      <MateriasTabla
        materias={(catalogo ?? []).map(entry => ({
          id: entry.id,
          nombre: entry.nombre,
          cursos: (instanciasPorCatalogo.get(entry.id) ?? []).sort((a, b) => a.localeCompare(b, 'es')),
        }))}
      />
    </div>
  )
}
