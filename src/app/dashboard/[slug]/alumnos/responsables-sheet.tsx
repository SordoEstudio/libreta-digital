'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Loader2, Trash2, Plus, Pencil, X } from 'lucide-react'
import { toast } from 'sonner'

interface Responsable {
  persona_id: string
  nombre: string
  email: string | null
  relacion: string | null
}

interface UsuarioResp {
  persona_id: string
  nombre: string
  email: string | null
}

interface Props {
  alumnoId: string
  alumnoNombre: string
  instId: string
  open?: boolean
  onOpenChange?: (v: boolean) => void
}

export default function ResponsablesSheet({ alumnoId, alumnoNombre, instId, open: openProp, onOpenChange }: Props) {
  const router = useRouter()
  const [openInternal, setOpenInternal] = useState(false)
  const open = openProp ?? openInternal
  const setOpen = onOpenChange ?? setOpenInternal

  const [responsables, setResponsables] = useState<Responsable[]>([])
  const [disponibles, setDisponibles] = useState<UsuarioResp[]>([])
  const [loading, setLoading] = useState(false)

  const [addId, setAddId] = useState('')
  const [addRelacion, setAddRelacion] = useState('')
  const [adding, setAdding] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editRelacion, setEditRelacion] = useState('')
  const [saving, setSaving] = useState(false)

  const [desvinculating, setDesvinculating] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const [respRes, dispRes] = await Promise.all([
      fetch(`/api/v1/alumnos/${alumnoId}/responsables`),
      fetch(`/api/v1/instituciones/${instId}/usuarios?rol=responsable`),
    ])
    const [respJson, dispJson] = await Promise.all([respRes.json(), dispRes.json()])
    setResponsables(respJson.data ?? [])
    setDisponibles(dispJson.data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    if (open) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!addId) return
    setAdding(true)

    const res = await fetch(`/api/v1/alumnos/${alumnoId}/responsables`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ persona_id: addId, relacion: addRelacion || undefined }),
    })
    const json = await res.json()
    setAdding(false)

    if (!res.ok) {
      toast.error(json.error?.message ?? 'Error al asignar')
      return
    }

    toast.success('Responsable asignado')
    setAddId('')
    setAddRelacion('')
    await load()
    router.refresh()
  }

  async function handleDesvincular(personaId: string) {
    if (!confirm('¿Desvincular este responsable?')) return
    setDesvinculating(personaId)

    const res = await fetch(`/api/v1/alumnos/${alumnoId}/responsables/${personaId}`, {
      method: 'DELETE',
    })
    const json = await res.json()
    setDesvinculating(null)

    if (!res.ok) {
      toast.error(json.error?.message ?? 'Error al desvincular')
      return
    }

    toast.success('Responsable desvinculado')
    await load()
    router.refresh()
  }

  async function handleSaveRelacion(personaId: string) {
    setSaving(true)

    const res = await fetch(`/api/v1/alumnos/${alumnoId}/responsables/${personaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ relacion: editRelacion || null }),
    })
    const json = await res.json()
    setSaving(false)

    if (!res.ok) {
      toast.error(json.error?.message ?? 'Error al guardar')
      return
    }

    toast.success('Relación actualizada')
    setEditingId(null)
    await load()
  }

  const yaAsignados = new Set(responsables.map(r => r.persona_id))
  const disponiblesParaAgregar = disponibles.filter(d => !yaAsignados.has(d.persona_id))

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Responsables</SheetTitle>
        </SheetHeader>
        <div className="mt-2 px-4 text-sm text-muted-foreground">
          Alumno: <strong>{alumnoNombre}</strong>
        </div>

        <div className="flex flex-col gap-4 mt-6 px-4">
          <div className="flex flex-col gap-2">
            {loading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : responsables.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">Sin responsables asignados.</p>
            ) : (
              responsables.map(r => (
                <div key={r.persona_id} className="flex flex-col gap-2 rounded-lg border p-3">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{r.nombre}</p>
                      {r.email && <p className="text-xs text-muted-foreground truncate">{r.email}</p>}
                      {editingId !== r.persona_id && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {r.relacion ?? <span className="italic">Sin relación</span>}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="size-7 p-0"
                        title={editingId === r.persona_id ? 'Cancelar' : 'Editar relación'}
                        onClick={() => {
                          if (editingId === r.persona_id) {
                            setEditingId(null)
                          } else {
                            setEditingId(r.persona_id)
                            setEditRelacion(r.relacion ?? '')
                          }
                        }}
                      >
                        {editingId === r.persona_id
                          ? <X className="size-3.5" />
                          : <Pencil className="size-3.5" />
                        }
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="size-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleDesvincular(r.persona_id)}
                        disabled={desvinculating === r.persona_id}
                        title="Desvincular"
                      >
                        {desvinculating === r.persona_id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="size-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                  {editingId === r.persona_id && (
                    <div className="flex items-center gap-1.5">
                      <Input
                        value={editRelacion}
                        onChange={e => setEditRelacion(e.target.value)}
                        placeholder="Relación (ej: Madre, Padre, Tutor)"
                        className="h-7 text-xs"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        className="h-7 px-2 text-xs shrink-0"
                        onClick={() => handleSaveRelacion(r.persona_id)}
                        disabled={saving}
                      >
                        {saving ? <Loader2 className="size-3 animate-spin" /> : 'Guardar'}
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {!loading && disponiblesParaAgregar.length > 0 && (
            <form onSubmit={handleAdd} className="flex flex-col gap-3 pt-3 border-t">
              <p className="text-sm font-medium">Agregar responsable</p>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="add-resp">Responsable *</Label>
                <Select value={addId} onValueChange={v => setAddId(v ?? '')}>
                  <SelectTrigger id="add-resp">
                    <SelectValue placeholder="Seleccionar...">
                      {addId ? disponibles.find(d => d.persona_id === addId)?.nombre : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {disponiblesParaAgregar.map(d => (
                      <SelectItem key={d.persona_id} value={d.persona_id}>
                        <span>{d.nombre}</span>
                        {d.email && <span className="text-xs text-muted-foreground ml-2">{d.email}</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="add-relacion">Relación</Label>
                <Input
                  id="add-relacion"
                  value={addRelacion}
                  onChange={e => setAddRelacion(e.target.value)}
                  placeholder="Ej: Madre, Padre, Tutor"
                />
              </div>
              <Button type="submit" disabled={adding || !addId} className="mt-1">
                {adding && <Loader2 data-icon="inline-start" className="animate-spin" />}
                <Plus className="size-4" />
                {adding ? 'Asignando...' : 'Asignar'}
              </Button>
            </form>
          )}

          {!loading && disponiblesParaAgregar.length === 0 && responsables.length === 0 && (
            <p className="text-xs text-muted-foreground border-t pt-3">
              No hay responsables disponibles. Primero invitá un usuario con rol Responsable.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
