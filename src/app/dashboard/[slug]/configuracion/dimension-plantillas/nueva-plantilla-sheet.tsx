'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  instId: string
}

interface ItemDraft {
  nombre: string
}

export default function NuevaPlantillaSheet({ instId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [nombre, setNombre] = useState('')
  const [items, setItems] = useState<ItemDraft[]>([{ nombre: '' }])

  function handleOpen() {
    setNombre('')
    setItems([{ nombre: '' }])
    setOpen(true)
  }

  function addItem() {
    setItems(prev => [...prev, { nombre: '' }])
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  function updateItem(idx: number, field: keyof ItemDraft, value: string) {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const body = {
      nombre,
      items: items.map(item => ({ nombre: item.nombre })),
    }

    const res = await fetch(`/api/v1/instituciones/${instId}/dimension-plantillas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const json = await res.json()
    setLoading(false)

    if (!res.ok) {
      toast.error(json.error?.message ?? 'Error al crear plantilla')
      return
    }

    toast.success('Plantilla creada')
    setOpen(false)
    router.refresh()
  }

  const canSubmit = nombre.trim().length > 0 && items.length > 0 && items.every(i => i.nombre.trim().length > 0)

  return (
    <>
      <Button size="sm" onClick={handleOpen}>
        <Plus className="size-4" />
        Nueva plantilla
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Nueva plantilla de dimensiones</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-6 px-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="np-nombre">Nombre de la plantilla *</Label>
              <Input
                id="np-nombre"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                maxLength={100}
                placeholder="Ej: Oral 30% / Escrito 70%"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Dimensiones *</Label>
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Input
                    value={item.nombre}
                    onChange={e => updateItem(idx, 'nombre', e.target.value)}
                    placeholder="Nombre"
                    maxLength={100}
                    className="flex-1"
                    required
                  />
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive/60 hover:text-destructive shrink-0"
                      onClick={() => removeItem(idx)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
              ))}

              <Button type="button" variant="outline" size="sm" onClick={addItem} className="self-start">
                <Plus className="size-3.5" />
                Agregar dimensión
              </Button>
            </div>

            <Button type="submit" disabled={loading || !canSubmit} className="mt-2">
              {loading && <Loader2 data-icon="inline-start" className="animate-spin" />}
              {loading ? 'Guardando...' : 'Crear plantilla'}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  )
}
