'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import UnidadForm from './unidad-form'

interface Props {
  unidadId: string
  initialNombre: string
  initialDescripcion: string | null
}

export default function UnidadSheet({ unidadId, initialNombre, initialDescripcion }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function handleDelete() {
    const res = await fetch(`/api/v1/contenidos/unidades/${unidadId}`, { method: 'DELETE' })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      toast.error(json.error?.message ?? 'Error al eliminar unidad')
      return
    }
    toast.success('Unidad eliminada')
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <Button variant="ghost" size="icon" className="size-7" onClick={() => setOpen(true)} title="Editar unidad">
        <Pencil className="size-3.5" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Editar unidad</SheetTitle>
          </SheetHeader>
          <div className="px-4 mt-6 flex flex-col gap-6">
            <UnidadForm
              mode="edit"
              unidadId={unidadId}
              initialNombre={initialNombre}
              initialDescripcion={initialDescripcion}
              onDone={() => setOpen(false)}
            />
            <div className="border-t pt-4">
              <Button
                variant="ghost"
                className="w-full text-destructive hover:text-destructive"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 data-icon="inline-start" />
                Eliminar unidad
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="¿Eliminar unidad?"
        description="Se eliminarán también todos los materiales de esta unidad."
        confirmLabel="Eliminar"
        destructive
        onConfirm={handleDelete}
      />
    </>
  )
}
