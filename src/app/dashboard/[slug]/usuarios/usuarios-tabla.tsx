'use client'

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Users, X, Link as LinkIcon, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import EditarUsuarioSheet from './editar-usuario-sheet'

const ROL_LABELS: Record<string, string> = {
  admin: 'Admin',
  docente: 'Docente',
  responsable: 'Responsable',
  superadmin: 'Superadmin',
}

const ROL_VARIANTS: Record<string, 'default' | 'secondary' | 'outline'> = {
  admin: 'default',
  docente: 'secondary',
  responsable: 'outline',
  superadmin: 'default',
}

interface UsuarioRow {
  personaId: string
  nombre: string
  email: string | null
  rol: string
  activo: boolean
  pendiente: boolean
  telefono: string | null
  dni: string | null
  direccion: string | null
}

interface Props {
  usuarios: UsuarioRow[]
  instId: string
}

const ROLES_FILTRO = ['admin', 'docente', 'responsable']

function CopiarLinkButton({ instId, personaId }: { instId: string; personaId: string }) {
  const [loading, setLoading] = useState(false)

  async function handleCopiar() {
    setLoading(true)
    const res = await fetch(`/api/v1/instituciones/${instId}/usuarios/${personaId}/invite`, { method: 'POST' })
    const json = await res.json()
    setLoading(false)

    if (!res.ok) {
      toast.error(json.error?.message ?? 'Error al generar link')
      return
    }

    await navigator.clipboard.writeText(json.data?.link ?? '')
    toast.success('Link de invitación copiado')
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="size-8 p-0"
      onClick={handleCopiar}
      disabled={loading}
      title="Copiar link de invitación"
    >
      {loading
        ? <Loader2 className="size-3.5 animate-spin" />
        : <LinkIcon className="size-3.5" />
      }
      <span className="sr-only">Copiar link</span>
    </Button>
  )
}

export default function UsuariosTabla({ usuarios, instId }: Props) {
  const [query, setQuery] = useState('')
  const [rolFiltro, setRolFiltro] = useState('todos')
  const [estadoFiltro, setEstadoFiltro] = useState('todos')

  const filtered = useMemo(() => {
    return usuarios.filter(u => {
      if (query) {
        const q = query.toLowerCase()
        if (!u.nombre.toLowerCase().includes(q) && !(u.email ?? '').toLowerCase().includes(q)) return false
      }
      if (rolFiltro !== 'todos' && u.rol !== rolFiltro) return false
      if (estadoFiltro === 'activo' && (u.pendiente || !u.activo)) return false
      if (estadoFiltro === 'inactivo' && (u.pendiente || u.activo)) return false
      if (estadoFiltro === 'pendiente' && !u.pendiente) return false
      return true
    })
  }, [usuarios, query, rolFiltro, estadoFiltro])

  const filtersActive = query || rolFiltro !== 'todos' || estadoFiltro !== 'todos'

  function clearFilters() {
    setQuery('')
    setRolFiltro('todos')
    setEstadoFiltro('todos')
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Input
          placeholder="Buscar por nombre o email..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="h-8 w-64 text-sm"
        />
        <Select value={rolFiltro} onValueChange={v => setRolFiltro(v ?? 'todos')}>
          <SelectTrigger className="h-8 w-40 text-sm">
            <SelectValue placeholder="Todos los roles">
              {rolFiltro === 'todos' ? 'Todos los roles' : ROL_LABELS[rolFiltro] ?? rolFiltro}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los roles</SelectItem>
            {ROLES_FILTRO.map(r => (
              <SelectItem key={r} value={r}>{ROL_LABELS[r]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={estadoFiltro} onValueChange={v => setEstadoFiltro(v ?? 'todos')}>
          <SelectTrigger className="h-8 w-36 text-sm">
            <SelectValue placeholder="Estado">
              {estadoFiltro === 'todos' ? 'Todos' :
               estadoFiltro === 'activo' ? 'Activo' :
               estadoFiltro === 'inactivo' ? 'Inactivo' : 'Pendiente'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="activo">Activo</SelectItem>
            <SelectItem value="inactivo">Inactivo</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
          </SelectContent>
        </Select>
        {filtersActive && (
          <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs text-muted-foreground" onClick={clearFilters}>
            <X className="size-3" />
            Limpiar
          </Button>
        )}
        {filtersActive && (
          <span className="text-xs text-muted-foreground ml-1">
            {filtered.length} de {usuarios.length}
          </span>
        )}
      </div>

      {filtered.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(u => (
                <TableRow key={u.personaId} className={!u.activo && !u.pendiente ? 'opacity-60' : ''}>
                  <TableCell className="font-medium">{u.nombre}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{u.email ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={ROL_VARIANTS[u.rol] ?? 'outline'}>
                      {ROL_LABELS[u.rol] ?? u.rol}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {u.pendiente ? (
                      <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                        Pendiente
                      </Badge>
                    ) : (
                      <Badge variant={u.activo ? 'default' : 'secondary'}>
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {u.pendiente && (
                        <CopiarLinkButton instId={instId} personaId={u.personaId} />
                      )}
                      {u.rol !== 'superadmin' && (
                        <EditarUsuarioSheet
                          instId={instId}
                          personaId={u.personaId}
                          nombre={u.nombre}
                          email={u.email}
                          rol={u.rol}
                          activo={u.activo}
                          telefono={u.telefono}
                          dni={u.dni}
                          direccion={u.direccion}
                        />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : usuarios.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <Users className="size-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">Sin usuarios registrados.</p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
          <p className="text-sm text-muted-foreground">Sin resultados. <button className="underline" onClick={clearFilters}>Limpiar filtros</button></p>
        </div>
      )}
    </div>
  )
}
