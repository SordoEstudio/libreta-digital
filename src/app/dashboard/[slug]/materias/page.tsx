import { requireSession, isSuperadmin, hasRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { BookOpen } from 'lucide-react'
import NuevaMateriaCatalogoSheet from './nueva-materia-catalogo-sheet'
import MateriaCatalogoAcciones from './materia-catalogo-acciones'

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

  if (!inst) notFound()
  if (!isSuperadmin(session) && !hasRole(session, inst.id, 'admin')) redirect(`/dashboard/${slug}`)

  const { data: catalogo } = await supabase
    .from('materias_catalogo')
    .select('id, nombre')
    .eq('institucion_id', inst.id)
    .is('deleted_at', null)
    .order('nombre')

  // Count active instances per catalog entry
  const { data: instancias } = await supabase
    .from('materias')
    .select('catalogo_id')
    .eq('institucion_id', inst.id)
    .is('deleted_at', null)

  const instanciasPorCatalogo = new Map<string, number>()
  for (const m of instancias ?? []) {
    instanciasPorCatalogo.set(m.catalogo_id, (instanciasPorCatalogo.get(m.catalogo_id) ?? 0) + 1)
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

      {catalogo && catalogo.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Instancias activas</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {catalogo.map(entry => {
                const count = instanciasPorCatalogo.get(entry.id) ?? 0
                return (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{entry.nombre}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {count === 0 ? 'Sin asignar' : `${count} curso${count !== 1 ? 's' : ''}`}
                    </TableCell>
                    <TableCell>
                      <MateriaCatalogoAcciones
                        id={entry.id}
                        nombre={entry.nombre}
                        hasInstancias={count > 0}
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <BookOpen className="size-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">Sin materias en el catálogo. Las materias se crean automáticamente al asignarlas a un curso, o podés agregarlas manualmente.</p>
        </div>
      )}
    </div>
  )
}
