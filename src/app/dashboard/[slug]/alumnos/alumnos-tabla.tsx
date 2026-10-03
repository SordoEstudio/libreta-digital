'use client'

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { GraduationCap, X } from 'lucide-react'
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

export default function AlumnosTabla({ alumnos, instId, slug, cursos }: Props) {
  const [query, setQuery] = useState('')
  const [cursoFiltro, setCursoFiltro] = useState('todos')
  const [estadoFiltro, setEstadoFiltro] = useState('todos')

  const cursosEnDatos = useMemo(() => {
    const map = new Map<string, string>()
    for (const a of alumnos) {
      if (a.cursoId && a.cursoNombre) map.set(a.cursoId, a.cursoNombre)
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [alumnos])

  const filtered = useMemo(() => {
    return alumnos.filter(a => {
      if (query && !a.nombre.toLowerCase().includes(query.toLowerCase())) return false
      if (cursoFiltro === 'sin-curso' && a.cursoId !== null) return false
      if (cursoFiltro !== 'todos' && cursoFiltro !== 'sin-curso' && a.cursoId !== cursoFiltro) return false
      if (estadoFiltro === 'activo' && !a.activo) return false
      if (estadoFiltro === 'inactivo' && a.activo) return false
      return true
    })
  }, [alumnos, query, cursoFiltro, estadoFiltro])

  const filtersActive = query || cursoFiltro !== 'todos' || estadoFiltro !== 'todos'

  function clearFilters() {
    setQuery('')
    setCursoFiltro('todos')
    setEstadoFiltro('todos')
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Input
          placeholder="Buscar por nombre..."
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
                <TableHead>Nombre</TableHead>
                <TableHead>Curso</TableHead>
                <TableHead>Responsables</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-24">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(alumno => (
                <TableRow key={alumno.id} className={!alumno.activo ? 'opacity-60' : ''}>
                  <TableCell className="font-medium">{alumno.nombre}</TableCell>
                  <TableCell>
                    {alumno.cursoNombre ?? (
                      <span className="text-muted-foreground text-xs">Sin curso</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <ResponsablesChips responsables={alumno.responsables} />
                  </TableCell>
                  <TableCell>
                    <Badge variant={alumno.activo ? 'default' : 'secondary'}>
                      {alumno.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <AlumnoAcciones
                      alumnoId={alumno.id}
                      alumnoNombre={alumno.nombre}
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
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <GraduationCap className="size-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">Sin alumnos registrados.</p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
          <p className="text-sm text-muted-foreground">Sin resultados. <button className="underline" onClick={clearFilters}>Limpiar filtros</button></p>
        </div>
      )}
    </div>
  )
}
