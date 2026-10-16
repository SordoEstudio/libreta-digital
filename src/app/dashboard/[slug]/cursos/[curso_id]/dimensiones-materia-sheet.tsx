'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Layers, Trash2, Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'

interface Dimension {
  id: string
  nombre: string
  peso: number | null
  orden: number
}

interface Plantilla {
  id: string
  nombre: string
}

interface Props {
  materiaId: string
  materiaNombre: string
  initialDimensiones: Dimension[]
  instId: string
}

export default function DimensionesMateriaSheet({ materiaId, materiaNombre, initialDimensiones, instId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [dimensiones, setDimensiones] = useState<Dimension[]>(initialDimensiones)
  const [nombre, setNombre] = useState('')
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; notasCount: number } | null>(null)
  const [plantillas, setPlantillas] = useState<Plantilla[]>([])
  const [plantillaId, setPlantillaId] = useState('')
  const [applying, setApplying] = useState(false)

  async function handleOpen(val: boolean) {
    if (val) {
      setDimensiones(initialDimensiones)
      setPlantillaId('')
      const res = await fetch(`/api/v1/instituciones/${instId}/dimension-plantillas`)
      if (res.ok) {
        const json = await res.json()
        setPlantillas((json.data ?? []) as Plantilla[])
      }
    }
    setOpen(val)
  }

  async function handleApply() {
    if (!plantillaId) return
    setApplying(true)
    const res = await fetch(`/api/v1/materias/${materiaId}/dimensiones/aplicar-plantilla`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plantilla_id: plantillaId }),
    })
    const json = await res.json()
    setApplying(false)
    if (res.ok) {
      toast.success('Plantilla aplicada')
      const dimRes = await fetch(`/api/v1/materias/${materiaId}/dimensiones`)
      if (dimRes.ok) {
        const dimJson = await dimRes.json()
        setDimensiones(dimJson.data ?? [])
      }
      setPlantillaId('')
      router.refresh()
    } else {
      toast.error(json.error?.message ?? 'Error al aplicar plantilla')
    }
  }

  async function handleAdd() {
    if (!nombre.trim()) return
    setAdding(true)
    const res = await fetch(`/api/v1/materias/${materiaId}/dimensiones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: nombre.trim() }),
    })
    const json = await res.json()
    setAdding(false)
    if (res.ok) {
      setDimensiones(prev => [...prev, json.data])
      setNombre('')
      toast.success('Dimensión agregada')
      router.refresh()
    } else {
      toast.error(json.error?.message ?? 'Error al agregar dimensión')
    }
  }

  async function handleDelete(dimId: string, force = false) {
    setDeletingId(dimId)
    const url = `/api/v1/materias/${materiaId}/dimensiones/${dimId}${force ? '?confirm=true' : ''}`
    const res = await fetch(url, { method: 'DELETE' })
    const json = await res.json()
    setDeletingId(null)
    if (res.ok) {
      setDimensiones(prev => prev.filter(d => d.id !== dimId))
      setConfirmDelete(null)
      toast.success('Dimensión eliminada')
      router.refresh()
    } else if (res.status === 409 && json.error?.code === 'HAS_NOTAS') {
      setConfirmDelete({ id: dimId, notasCount: json.error.notasCount ?? 0 })
    } else {
      toast.error(json.error?.message ?? 'Error al eliminar dimensión')
    }
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => handleOpen(true)}>
        <Layers className="size-4" />
        Dimensiones
      </Button>

      <Sheet open={open} onOpenChange={handleOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Dimensiones — {materiaNombre}</SheetTitle>
          </SheetHeader>

          <div className="flex flex-col gap-4 mt-4 px-4">
            {dimensiones.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin dimensiones configuradas.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {dimensiones.map(d => (
                  <div key={d.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">{d.nombre}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(d.id)}
                      disabled={deletingId === d.id}
                    >
                      {deletingId === d.id
                        ? <Loader2 className="size-4 animate-spin" />
                        : <Trash2 className="size-4 text-destructive" />}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-3 border-t pt-4">
              <p className="text-sm font-medium">Agregar dimensión</p>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="dim-nombre">Nombre</Label>
                <Input
                  id="dim-nombre"
                  placeholder="Ej: Oral"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                />
              </div>
              <Button
                onClick={handleAdd}
                disabled={adding || !nombre.trim()}
              >
                {adding
                  ? <Loader2 data-icon="inline-start" className="animate-spin" />
                  : <Plus data-icon="inline-start" />}
                Agregar
              </Button>
            </div>

            {confirmDelete && (
              <AlertDialog open onOpenChange={v => { if (!v) setConfirmDelete(null) }}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar dimensión?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Hay {confirmDelete.notasCount} nota{confirmDelete.notasCount !== 1 ? 's' : ''} vinculada{confirmDelete.notasCount !== 1 ? 's' : ''} a esta dimensión.
                      Al eliminarla, esas notas quedarán sin dimensión asignada. Esta acción no se puede deshacer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(confirmDelete.id, true)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Eliminar de todas formas
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {plantillas.length > 0 && (
              <div className="flex flex-col gap-3 border-t pt-4">
                <p className="text-sm font-medium">Aplicar plantilla</p>
                <select
                  value={plantillaId}
                  onChange={e => setPlantillaId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                >
                  <option value="">Seleccioná una plantilla</option>
                  {plantillas.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
                <AlertDialog>
                  <AlertDialogTrigger render={<Button variant="secondary" disabled={!plantillaId || applying} />}>
                    {applying && <Loader2 data-icon="inline-start" className="animate-spin" />}
                    Aplicar
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Reemplazar dimensiones?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esto eliminará las dimensiones actuales de la materia y las reemplazará con las de la plantilla.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleApply}>
                        Confirmar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
