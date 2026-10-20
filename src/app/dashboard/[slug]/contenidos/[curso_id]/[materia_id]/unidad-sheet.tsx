'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Pencil } from 'lucide-react'
import UnidadForm from './unidad-form'

interface Props {
  unidadId: string
  initialNombre: string
  initialDescripcion: string | null
}

export default function UnidadSheet({ unidadId, initialNombre, initialDescripcion }: Props) {
  const [open, setOpen] = useState(false)
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
          <div className="px-4 mt-6">
            <UnidadForm
              mode="edit"
              unidadId={unidadId}
              initialNombre={initialNombre}
              initialDescripcion={initialDescripcion}
              onDone={() => setOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
