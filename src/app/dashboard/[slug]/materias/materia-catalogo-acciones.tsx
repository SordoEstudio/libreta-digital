'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Pencil, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface Props {
  id: string
  nombre: string
  hasInstancias: boolean
}

export default function MateriaCatalogoAcciones({ id, nombre, hasInstancias }: Props) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [editNombre, setEditNombre] = useState(nombre)
  const [loading, setLoading] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const res = await fetch(`/api/v1/materias-catalogo/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: editNombre }),
    })

    const json = await res.json()
    setLoading(false)

    if (!res.ok) {
      toast.error(json.error?.message ?? 'Error al editar')
      return
    }

    toast.success('Nombre actualizado')
    setEditOpen(false)
    router.refresh()
  }

  async function handleDelete() {
    const res = await fetch(`/api/v1/materias-catalogo/${id}`, { method: 'DELETE' })

    if (!res.ok) {
      const json = await res.json()
      toast.error(json.error?.message ?? 'Error al eliminar')
      return
    }

    toast.success('Materia eliminada del catálogo')
    router.refresh()
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="size-8 p-0" />}>
          <MoreHorizontal className="size-4" />
          <span className="sr-only">Acciones</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => { setEditNombre(nombre); setEditOpen(true) }}>
            <Pencil className="size-4" />
            Editar nombre
          </DropdownMenuItem>
          {!hasInstancias && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="size-4" />
                Eliminar
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`¿Eliminar "${nombre}" del catálogo?`}
        description="Solo si no tiene notas cargadas. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        destructive
        onConfirm={() => { setDeleteOpen(false); handleDelete() }}
      />

      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Editar materia</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleEdit} className="flex flex-col gap-4 mt-6 px-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-nombre">Nombre *</Label>
              <Input
                id="edit-nombre"
                value={editNombre}
                onChange={e => setEditNombre(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={loading || !editNombre.trim()} className="mt-2">
              {loading && <Loader2 data-icon="inline-start" className="animate-spin" />}
              {loading ? 'Guardando...' : 'Guardar'}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  )
}
