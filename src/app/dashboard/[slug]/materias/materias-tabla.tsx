'use client'

import { useState, useMemo } from 'react'
import { SearchInput } from '@/components/ui/search-input'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Tooltip } from '@base-ui/react/tooltip'
import { BookOpen, X } from 'lucide-react'
import MateriaCatalogoAcciones from './materia-catalogo-acciones'

interface MateriaRow {
  id: string
  nombre: string
  cursos: string[]
}

interface Props {
  materias: MateriaRow[]
}

export default function MateriasTabla({ materias }: Props) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    if (!query) return materias
    const q = query.toLowerCase()
    return materias.filter(m => m.nombre.toLowerCase().includes(q))
  }, [materias, query])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <SearchInput
          placeholder="Buscar por nombre..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="h-8 w-56 text-sm"
        />
        {query && (
          <>
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs text-muted-foreground" onClick={() => setQuery('')}>
              <X className="size-3" />
              Limpiar
            </Button>
            <span className="text-xs text-muted-foreground ml-1">
              {filtered.length} de {materias.length}
            </span>
          </>
        )}
      </div>

      {filtered.length > 0 ? (
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
              {filtered.map(entry => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">{entry.nombre}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {entry.cursos.length === 0 ? (
                      'Sin asignar'
                    ) : (
                      <Tooltip.Provider delay={200}>
                        <Tooltip.Root>
                          <Tooltip.Trigger className="cursor-default underline decoration-dotted underline-offset-2">
                            {entry.cursos.length} curso{entry.cursos.length !== 1 ? 's' : ''}
                          </Tooltip.Trigger>
                          <Tooltip.Portal>
                            <Tooltip.Positioner sideOffset={4}>
                              <Tooltip.Popup className="z-50 rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md max-w-xs">
                                <p className="font-medium mb-1 text-foreground">Cursos asignados</p>
                                <ul className="space-y-0.5">
                                  {entry.cursos.map(c => (
                                    <li key={c} className="text-muted-foreground">{c}</li>
                                  ))}
                                </ul>
                              </Tooltip.Popup>
                            </Tooltip.Positioner>
                          </Tooltip.Portal>
                        </Tooltip.Root>
                      </Tooltip.Provider>
                    )}
                  </TableCell>
                  <TableCell>
                    <MateriaCatalogoAcciones
                      id={entry.id}
                      nombre={entry.nombre}
                      hasInstancias={entry.cursos.length > 0}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : materias.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Sin materias en el catálogo."
          description="Las materias se crean automáticamente al asignarlas a un curso, o podés agregarlas manualmente."
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
          <p className="text-sm text-muted-foreground">Sin resultados para &quot;{query}&quot;.</p>
        </div>
      )}
    </div>
  )
}
