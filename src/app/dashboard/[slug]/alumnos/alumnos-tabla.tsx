'use client'

import { useState, useMemo } from 'react'
import { SearchInput } from '@/components/ui/search-input'
import { EmptyState } from '@/components/ui/empty-state'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { GraduationCap, X, ChevronsUpDown, ChevronUp, ChevronDown } from 'lucide-react'
import AlumnoAcciones from './alumno-acciones'
import { ResponsablesChips } from './responsables-chips'

interface RespRow {
  persona_id: string
  nombre: string
  email: string | null
  relacion: string | null
}

interface AlumnoRow {
  id: string
  nombre: string
  apellido: string | null
  activo: boolean
  cursoId: string | null
  cursoNombre: string | null
  responsables: RespRow[]
}

interface Props {
  alumnos: AlumnoRow[]
  instId: string
  slug: string
  cursos: Array<{ id: string; nombre: string }>
}

type SortCol = 'apellido' | 'curso'
type SortDir = 'asc' | 'desc'

function SortIcon({ col, sortCol, sortDir }: { col: SortCol; sortCol: SortCol; sortDir: SortDir }) {
  if (sortCol !== col) return <ChevronsUpDown className="size-3 ml-1 opacity-40" />
  return sortDir === 'asc'
    ? <ChevronUp className="size-3 ml-1" />
    : <ChevronDown className="size-3 ml-1" />
}

function displayNombre(row: AlumnoRow) {
  if (row.apellido) return `${row.apellido}, ${row.nombre}`
  return row.nombre
}

export default function AlumnosTabla({ alumnos, instId, slug, cursos }: Props) {
  const [query, setQuery] = useState('')
  const [cursoFiltro, setCursoFiltro] = useState('todos')
  const [estadoFiltro, setEstadoFiltro] = useState('todos')
  const [sortCol, setSortCol] = useState<SortCol>('apellido')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  function toggleSort(col: SortCol) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const cursosEnDatos = useMemo(() => {
    const map = new Map<string, string>()
    for (const a of alumnos) {
      if (a.cursoId && a.cursoNombre) map.set(a.cursoId, a.cursoNombre)
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [alumnos])

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    const rows = alumnos.filter(a => {
      if (q) {
        const full = `${a.apellido ?? ''} ${a.nombre}`.toLowerCase()
        if (!full.includes(q)) return false
      }
      if (cursoFiltro === 'sin-curso' && a.cursoId !== null) return false
      if (cursoFiltro !== 'todos' && cursoFiltro !== 'sin-curso' && a.cursoId !== cursoFiltro) return false
      if (estadoFiltro === 'activo' && !a.activo) return false
      if (estadoFiltro === 'inactivo' && a.activo) return false
      return true
    })

    rows.sort((a, b) => {
      let cmp = 0
      if (sortCol === 'apellido') {
        const aKey = `${a.apellido ?? ''}\x00${a.nombre}`.toLowerCase()
        const bKey = `${b.apellido ?? ''}\x00${b.nombre}`.toLowerCase()
        cmp = aKey.localeCompare(bKey, 'es')
      } else if (sortCol === 'curso') {
        cmp = (a.cursoNombre ?? '').localeCompare(b.cursoNombre ?? '', 'es')
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    return rows
  }, [alumnos, query, cursoFiltro, estadoFiltro, sortCol, sortDir])

  const filtersActive = query || cursoFiltro !== 'todos' || estadoFiltro !== 'todos'

  function clearFilters() {
    setQuery('')
    setCursoFiltro('todos')
    setEstadoFiltro('todos')
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 flex-wrap">
        <SearchInput
          placeholder="Buscar por nombre o apellido..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="h-8 w-56 text-sm"
        />
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Curso</span>
          <Select value={cursoFiltro} onValueChange={v => setCursoFiltro(v ?? 'todos')}>
            <SelectTrigger className="h-8 w-44 text-sm" aria-label="Filtrar por curso">
              <SelectValue placeholder="Todos los cursos">
                {cursoFiltro === 'todos' ? 'Todos los cursos' :
                 cursoFiltro === 'sin-curso' ? 'Sin curso' :
                 cursosEnDatos.find(([id]) => id === cursoFiltro)?.[1] ?? 'Curso'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los cursos</SelectItem>
              {cursosEnDatos.map(([id, nombre]) => (
                <SelectItem key={id} value={id}>{nombre}</SelectItem>
              ))}
              <SelectItem value="sin-curso">Sin curso</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Estado</span>
          <Select value={estadoFiltro} onValueChange={v => setEstadoFiltro(v ?? 'todos')}>
            <SelectTrigger className="h-8 w-32 text-sm" aria-label="Filtrar por estado">
              <SelectValue placeholder="Estado">
                {estadoFiltro === 'todos' ? 'Todos' :
                 estadoFiltro === 'activo' ? 'Activo' : 'Inactivo'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="activo">Activo</SelectItem>
              <SelectItem value="inactivo">Inactivo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {filtersActive && (
          <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs text-muted-foreground" onClick={clearFilters}>
            <X className="size-3" />
            Limpiar
          </Button>
        )}
        {filtersActive && (
          <span className="text-xs text-muted-foreground ml-1">
            {filtered.length} de {alumnos.length}
          </span>
        )}
      </div>

      {filtered.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <button
                    className="flex items-center text-xs font-medium hover:text-foreground transition-colors"
                    onClick={() => toggleSort('apellido')}
                  >
                    Apellido, Nombre
                    <SortIcon col="apellido" sortCol={sortCol} sortDir={sortDir} />
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    className="flex items-center text-xs font-medium hover:text-foreground transition-colors"
                    onClick={() => toggleSort('curso')}
                  >
                    Curso
                    <SortIcon col="curso" sortCol={sortCol} sortDir={sortDir} />
                  </button>
                </TableHead>
                <TableHead>Responsables</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-24">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(alumno => (
                <TableRow key={alumno.id} className={!alumno.activo ? 'opacity-60' : ''}>
                  <TableCell className="font-medium">{displayNombre(alumno)}</TableCell>
                  <TableCell>
                    {alumno.cursoNombre ?? (
                      <span className="text-muted-foreground text-xs">Sin curso</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <ResponsablesChips responsables={alumno.responsables} />
                  </TableCell>
                  <TableCell>
                    <Badge variant={alumno.activo ? 'default' : 'outline'}>
                      {alumno.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <AlumnoAcciones
                      alumnoId={alumno.id}
                      alumnoNombre={displayNombre(alumno)}
                      activo={alumno.activo}
                      instId={instId}
                      slug={slug}
                      cursos={cursos}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : alumnos.length === 0 ? (
        <EmptyState icon={GraduationCap} title="Sin alumnos registrados." />
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
          <p className="text-sm text-muted-foreground">Sin resultados. <button className="underline" onClick={clearFilters}>Limpiar filtros</button></p>
        </div>
      )}
    </div>
  )
}
