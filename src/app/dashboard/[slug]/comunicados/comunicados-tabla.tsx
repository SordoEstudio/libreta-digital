'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Search, X, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react'
import { MessageSquare } from 'lucide-react'

type Comunicado = {
  id: string
  titulo: string
  curso_id: string
  created_at: string
  cursoNombre: string
  materiaNombre: string | null
  total: number
  confirmados: number
}

type SortKey = 'fecha' | 'titulo' | 'curso' | 'confirmaciones'
type SortDir = 'asc' | 'desc'

interface Props {
  slug: string
  comunicados: Comunicado[]
}

function SortIcon({ col, sortKey, dir }: { col: SortKey; sortKey: SortKey; dir: SortDir }) {
  if (col !== sortKey) return <ArrowUpDown className="size-3.5 opacity-40 ml-1 inline" />
  return dir === 'asc'
    ? <ChevronUp className="size-3.5 ml-1 inline" />
    : <ChevronDown className="size-3.5 ml-1 inline" />
}

export default function ComunicadosTabla({ slug, comunicados }: Props) {
  const [query, setQuery] = useState('')
  const [cursoFiltro, setCursoFiltro] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('fecha')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const cursosUnicos = useMemo(() => {
    const seen = new Set<string>()
    return comunicados
      .filter(c => { if (seen.has(c.cursoNombre)) return false; seen.add(c.cursoNombre); return true })
      .map(c => c.cursoNombre)
      .sort((a, b) => a.localeCompare(b, 'es'))
  }, [comunicados])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase()
    let rows = comunicados.filter(c => {
      if (cursoFiltro && c.cursoNombre !== cursoFiltro) return false
      if (!q) return true
      return c.titulo.toLowerCase().includes(q) || c.cursoNombre.toLowerCase().includes(q) || (c.materiaNombre?.toLowerCase().includes(q) ?? false)
    })

    rows = [...rows].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'fecha') cmp = a.created_at.localeCompare(b.created_at)
      else if (sortKey === 'titulo') cmp = a.titulo.localeCompare(b.titulo, 'es')
      else if (sortKey === 'curso') cmp = a.cursoNombre.localeCompare(b.cursoNombre, 'es')
      else if (sortKey === 'confirmaciones') cmp = (a.total ? a.confirmados / a.total : 0) - (b.total ? b.confirmados / b.total : 0)
      return sortDir === 'asc' ? cmp : -cmp
    })

    return rows
  }, [comunicados, query, cursoFiltro, sortKey, sortDir])

  const hayFiltros = query || cursoFiltro

  if (comunicados.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <MessageSquare className="size-12 text-muted-foreground/40" />
        <p className="text-muted-foreground">Aún no hay comunicados.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar por título o curso…"
            className="pl-9 pr-8"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted">
              <X className="size-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
        {cursosUnicos.length > 1 && (
          <div className="w-48">
            <Select value={cursoFiltro || '__all__'} onValueChange={v => setCursoFiltro((v ?? '') === '__all__' ? '' : (v ?? ''))}>
              <SelectTrigger>
                <SelectValue>{cursoFiltro || 'Todos los cursos'}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos los cursos</SelectItem>
                {cursosUnicos.map(c => (
                  <SelectItem key={c} value={c ?? ''}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {filtrados.length} de {comunicados.length}
        {hayFiltros && (
          <button
            className="ml-2 underline hover:no-underline"
            onClick={() => { setQuery(''); setCursoFiltro('') }}
          >
            Limpiar filtros
          </button>
        )}
      </p>

      {/* Mobile */}
      <div className="flex flex-col gap-2 md:hidden">
        {filtrados.map(c => (
          <Link
            key={c.id}
            href={`/dashboard/${slug}/comunicados/${c.id}`}
            className="block rounded-lg border p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium leading-snug">{c.titulo}</p>
              <Badge variant={c.confirmados === c.total && c.total > 0 ? 'default' : 'outline'} className="shrink-0 text-xs">
                {c.confirmados}/{c.total}
              </Badge>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
              <span>{c.cursoNombre}</span>
              {c.materiaNombre && <><span>·</span><span>{c.materiaNombre}</span></>}
              <span>·</span>
              <span>{new Date(c.created_at).toLocaleDateString('es-AR')}</span>
            </div>
          </Link>
        ))}
        {filtrados.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">Sin resultados.</p>
        )}
      </div>

      {/* Desktop */}
      <div className="hidden md:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button onClick={() => toggleSort('titulo')} className="flex items-center gap-0.5 hover:text-foreground">
                  Título <SortIcon col="titulo" sortKey={sortKey} dir={sortDir} />
                </button>
              </TableHead>
              <TableHead>
                <button onClick={() => toggleSort('curso')} className="flex items-center gap-0.5 hover:text-foreground">
                  Curso / Materia <SortIcon col="curso" sortKey={sortKey} dir={sortDir} />
                </button>
              </TableHead>
              <TableHead>
                <button onClick={() => toggleSort('fecha')} className="flex items-center gap-0.5 hover:text-foreground">
                  Fecha <SortIcon col="fecha" sortKey={sortKey} dir={sortDir} />
                </button>
              </TableHead>
              <TableHead>
                <button onClick={() => toggleSort('confirmaciones')} className="flex items-center gap-0.5 hover:text-foreground">
                  Confirmaciones <SortIcon col="confirmaciones" sortKey={sortKey} dir={sortDir} />
                </button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.map(c => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">
                  <Link href={`/dashboard/${slug}/comunicados/${c.id}`} className="hover:underline">
                    {c.titulo}
                  </Link>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {c.cursoNombre}
                  {c.materiaNombre && <span className="text-muted-foreground/70"> · {c.materiaNombre}</span>}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(c.created_at).toLocaleDateString('es-AR')}
                </TableCell>
                <TableCell>
                  <Badge variant={c.confirmados === c.total && c.total > 0 ? 'default' : 'outline'}>
                    {c.confirmados}/{c.total}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {filtrados.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                  Sin resultados para los filtros aplicados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
