'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Loader2, Pencil } from 'lucide-react'
import { toast } from 'sonner'

const TIPOS = [
  { value: 'numerica', label: 'Numérica' },
  { value: 'conceptual', label: 'Conceptual' },
]

interface Periodo { id: string; nombre: string; orden: number }
interface Dimension { id: string; nombre: string; orden: number }

interface Props {
  evalRefId: string
  initialNombre: string
  initialTipo: 'numerica' | 'conceptual'
  initialFecha: string | null
  initialPeriodoId: string | null
  initialDimensionIds: string[]
  periodos: Periodo[]
  dimensiones: Dimension[]
}

export default function EditarEvalRefSheet({
  evalRefId,
  initialNombre,
  initialTipo,
  initialFecha,
  initialPeriodoId,
  initialDimensionIds,
  periodos,
  dimensiones,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [nombre, setNombre] = useState(initialNombre)
  const [tipo, setTipo] = useState(initialTipo)
  const [fecha, setFecha] = useState(initialFecha ?? '')
  const [periodoId, setPeriodoId] = useState(initialPeriodoId ?? '')
  const [selectedDims, setSelectedDims] = useState<Set<string>>(new Set(initialDimensionIds))

  function handleOpen() {
    setNombre(initialNombre)
    setTipo(initialTipo)
    setFecha(initialFecha ?? '')
    setPeriodoId(initialPeriodoId ?? '')
    setSelectedDims(new Set(initialDimensionIds))
    setOpen(true)
  }

  function toggleDim(id: string) {
    setSelectedDims(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const res = await fetch(`/api/v1/evaluaciones-referencia/${evalRefId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre,
        tipo,
        fecha: fecha || null,
        periodo_id: periodoId || null,
        dimension_ids: [...selectedDims],
      }),
    })

    const json = await res.json()
    setLoading(false)

    if (!res.ok) {
      toast.error(json.error?.message ?? 'Error al guardar')
      return
    }

    toast.success('Evaluación actualizada')
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <Button variant="ghost" size="icon" className="size-7" onClick={handleOpen}>
        <Pencil className="size-3.5" />
        <span className="sr-only">Editar {initialNombre}</span>
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Editar evaluación de referencia</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-6 px-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-ref-nombre">Nombre *</Label>
              <Input
                id="edit-ref-nombre"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-ref-tipo">Tipo *</Label>
              <Select value={tipo} onValueChange={v => setTipo(v as 'numerica' | 'conceptual')}>
                <SelectTrigger id="edit-ref-tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {periodos.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-ref-periodo">Período</Label>
                <Select value={periodoId} onValueChange={v => setPeriodoId(v ?? '')}>
                  <SelectTrigger id="edit-ref-periodo">
                    <SelectValue placeholder="Sin período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin período</SelectItem>
                    {periodos.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {dimensiones.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <Label>Dimensiones</Label>
                <div className="flex flex-wrap gap-1.5">
                  {dimensiones.map(d => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => toggleDim(d.id)}
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                        selectedDims.has(d.id)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {d.nombre}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-ref-fecha">Fecha (opcional)</Label>
              <input
                id="edit-ref-fecha"
                type="date"
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <Button type="submit" disabled={loading || !nombre || !tipo} className="mt-2">
              {loading && <Loader2 data-icon="inline-start" className="animate-spin" />}
              {loading ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  )
}
