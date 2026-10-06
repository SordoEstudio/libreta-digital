'use client'

import { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { ChevronsUpDown, ChevronUp, ChevronDown } from 'lucide-react'
import Link from 'next/link'

interface Alumno {
  id: string
  nombre: string
  apellido: string | null
  activo: boolean
}

interface Props {
  alumnos: Alumno[]
  slug: string
}

type SortCol = 'nombre' | 'estado'
type SortDir = 'asc' | 'desc'

function displayNombre(a: Alumno) {
  return a.apellido ? `${a.apellido}, ${a.nombre}` : a.nombre
}

function SortIcon({ col, sortCol, sortDir }: { col: SortCol; sortCol: SortCol; sortDir: SortDir }) {
  if (sortCol !== col) return <ChevronsUpDown className="size-3 ml-1 opacity-40" />
  return sortDir === 'asc'
    ? <ChevronUp className="size-3 ml-1" />
    : <ChevronDown className="size-3 ml-1" />
}

export default function AlumnosCursoTabla({ alumnos, slug }: Props) {
  const [sortCol, setSortCol] = useState<SortCol>('nombre')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  function toggleSort(col: SortCol) {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(col)
      setSortDir('asc')
    }
  }

  const sorted = useMemo(() => {
    return [...alumnos].sort((a, b) => {
      let cmp = 0
      if (sortCol === 'nombre') {
        cmp = displayNombre(a).localeCompare(displayNombre(b), 'es')
      } else {
        cmp = (a.activo ? 0 : 1) - (b.activo ? 0 : 1)
        if (cmp === 0) cmp = displayNombre(a).localeCompare(displayNombre(b), 'es')
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [alumnos, sortCol, sortDir])

  return (
    <div className="rounded-md border max-h-[480px] overflow-y-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <button className="flex items-center font-medium" onClick={() => toggleSort('nombre')}>
                Apellido, Nombre
                <SortIcon col="nombre" sortCol={sortCol} sortDir={sortDir} />
              </button>
            </TableHead>
            <TableHead>
              <button className="flex items-center font-medium" onClick={() => toggleSort('estado')}>
                Estado
                <SortIcon col="estado" sortCol={sortCol} sortDir={sortDir} />
              </button>
            </TableHead>
            <TableHead className="w-28" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map(a => (
            <TableRow key={a.id} className={!a.activo ? 'opacity-60' : ''}>
              <TableCell className="font-medium">{displayNombre(a)}</TableCell>
              <TableCell>
                <Badge variant={a.activo ? 'default' : 'outline'}>
                  {a.activo ? 'Activo' : 'Inactivo'}
                </Badge>
              </TableCell>
              <TableCell>
                <Button
                  variant="secondary"
                  size="sm"
                  render={<Link href={`/dashboard/${slug}/libreta/${a.id}`} />}
                >
                  Ver libreta
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
