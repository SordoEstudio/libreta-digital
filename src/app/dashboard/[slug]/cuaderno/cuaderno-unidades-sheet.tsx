'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Layers, Trash2, Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'

interface Unidad {
  id: string
  nombre: string
  orden: number
  fechaInicio: string | null
  fechaFin: string | null
}

interface Props {
  materiaId: string
  unidades: Unidad[]
}

export default function CuadernoUnidadesSheet({ materiaId, unidades: initialUnidades }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [unidades, setUnidades] = useState<Unidad[]>(initialUnidades)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Unidad | null>(null)

  function handleOpen(val: boolean) {
    if (val) {
      setUnidades(initialUnidades)
    }
    setOpen(val)
  }

  async function handleAdd() {
    if (!nuevoNombre.trim()) return
    setAdding(true)
    const res = await fetch(`/api/v1/materias/${materiaId}/unidades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: nuevoNombre.trim() }),
    })
    const json = await res.json()
    setAdding(false)
    if (res.ok) {
      const nueva: Unidad = {
        id: json.data.id,
        nombre: json.data.nombre,
        orden: json.data.orden,
        fechaInicio: json.data.fecha_inicio ?? null,
        fechaFin: json.data.fecha_fin ?? null,
      }
      setUnidades(prev => [...prev, nueva])
      setNuevoNombre('')
      toast.success('Unidad agregada')
      router.refresh()
    } else {
      toast.error(json.error?.message ?? 'Error al agregar unidad')
    }
  }

  async function handleDelete(unidad: Unidad) {
    setDeletingId(unidad.id)
    const res = await fetch(`/api/v1/unidades/${unidad.id}`, { method: 'DELETE' })
    const json = await res.json()
    setDeletingId(null)
    setConfirmDelete(null)
    if (res.ok) {
      setUnidades(prev => prev.filter(u => u.id !== unidad.id))
      toast.success(`"${unidad.nombre}" eliminada`)
      router.refresh()
    } else {
      toast.error(json.error?.message ?? 'Error al eliminar unidad')
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => handleOpen(true)}>
        <Layers className="size-4" />
        Gestionar unidades
      </Button>

      <Sheet open={open} onOpenChange={handleOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Unidades</SheetTitle>
          </SheetHeader>

          <div className="flex flex-col gap-4 mt-4 px-4">
            {unidades.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin unidades configuradas.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {unidades.map(u => (
                  <div key={u.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <p className="text-sm font-medium">{u.nombre}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setConfirmDelete(u)}
                      disabled={deletingId === u.id}
                    >
                      {deletingId === u.id
                        ? <Loader2 className="size-4 animate-spin" />
                        : <Trash2 className="size-4 text-destructive" />}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-3 border-t pt-4">
              <p className="text-sm font-medium">Agregar unidad</p>
              <Input
                placeholder="Ej: Unidad 1"
                value={nuevoNombre}
                onChange={e => setNuevoNombre(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void handleAdd() } }}
              />
              <Button
                onClick={handleAdd}
                disabled={adding || !nuevoNombre.trim()}
              >
                {adding
                  ? <Loader2 data-icon="inline-start" className="animate-spin" />
                  : <Plus data-icon="inline-start" />}
                Agregar
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {confirmDelete && (
        <AlertDialog open onOpenChange={v => { if (!v) setConfirmDelete(null) }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar &quot;{confirmDelete.nombre}&quot;?</AlertDialogTitle>
              <AlertDialogDescription>
                Se quitará la unidad de todas las evaluaciones asignadas.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleDelete(confirmDelete)}
                disabled={deletingId === confirmDelete.id}
                variant="destructive"
              >
                {deletingId === confirmDelete.id && <Loader2 data-icon="inline-start" className="animate-spin" />}
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  )
}
