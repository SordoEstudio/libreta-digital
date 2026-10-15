'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Layers, Trash2, Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'

interface Dimension {
  id: string
  nombre: string
  peso: number
  orden: number
}

interface Props {
  materiaId: string
  materiaNombre: string
  initialDimensiones: Dimension[]
}

export default function DimensionesMateriaSheet({ materiaId, materiaNombre, initialDimensiones }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [dimensiones, setDimensiones] = useState<Dimension[]>(initialDimensiones)
  const [nombre, setNombre] = useState('')
  const [peso, setPeso] = useState('')
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const totalPeso = dimensiones.reduce((sum, d) => sum + d.peso, 0)

  function handleOpen(val: boolean) {
    if (val) setDimensiones(initialDimensiones)
    setOpen(val)
  }

  async function handleAdd() {
    const pesoNum = parseFloat(peso)
    if (!nombre.trim() || isNaN(pesoNum) || pesoNum <= 0) return
    setAdding(true)
    const res = await fetch(`/api/v1/materias/${materiaId}/dimensiones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: nombre.trim(), peso: pesoNum }),
    })
    const json = await res.json()
    setAdding(false)
    if (res.ok) {
      setDimensiones(prev => [...prev, json.data])
      setNombre('')
      setPeso('')
      toast.success('Dimensión agregada')
      router.refresh()
    } else {
      toast.error(json.error?.message ?? 'Error al agregar dimensión')
    }
  }

  async function handleDelete(dimId: string) {
    setDeletingId(dimId)
    const res = await fetch(`/api/v1/materias/${materiaId}/dimensiones/${dimId}`, { method: 'DELETE' })
    const json = await res.json()
    setDeletingId(null)
    if (res.ok) {
      setDimensiones(prev => prev.filter(d => d.id !== dimId))
      toast.success('Dimensión eliminada')
      router.refresh()
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
                      <p className="text-xs text-muted-foreground">Peso: {d.peso}%</p>
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
                <p className="text-xs text-muted-foreground text-right">
                  Total: {totalPeso}%{totalPeso !== 100 && ' (no suma 100%)'}
                </p>
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
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="dim-peso">Peso (%)</Label>
                <Input
                  id="dim-peso"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="Ej: 40"
                  value={peso}
                  onChange={e => setPeso(e.target.value)}
                />
              </div>
              <Button
                onClick={handleAdd}
                disabled={adding || !nombre.trim() || !peso}
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
    </>
  )
}
