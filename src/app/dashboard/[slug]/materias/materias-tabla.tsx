'use client'

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { BookOpen, X } from 'lucide-react'
import MateriaCatalogoAcciones from './materia-catalogo-acciones'

interface MateriaRow {
  id: string
  nombre: string
  instancias: number
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
        <Input
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
                    {entry.instancias === 0
                      ? 'Sin asignar'
                      : `${entry.instancias} curso${entry.instancias !== 1 ? 's' : ''}`}
                  </TableCell>
                  <TableCell>
                    <MateriaCatalogoAcciones
                      id={entry.id}
                      nombre={entry.nombre}
                      hasInstancias={entry.instancias > 0}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : materias.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <BookOpen className="size-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">Sin materias en el catálogo. Las materias se crean automáticamente al asignarlas a un curso, o podés agregarlas manualmente.</p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
          <p className="text-sm text-muted-foreground">Sin resultados para &quot;{query}&quot;.</p>
        </div>
      )}
    </div>
  )
}
