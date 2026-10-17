'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'

const TIPOS = [
  { value: 'numerica', label: 'Numérica' },
  { value: 'conceptual', label: 'Conceptual' },
]

interface Periodo { id: string; nombre: string; orden: number }
interface Dimension { id: string; nombre: string; orden: number }
interface Unidad { id: string; nombre: string }

interface Props {
  materiaId: string
  periodos: Periodo[]
  dimensiones: Dimension[]
  unidades?: Unidad[]
}

export default function NuevaEvalRefSheet({ materiaId, periodos, dimensiones, unidades = [] }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState('')
  const [fecha, setFecha] = useState('')
  const [periodoId, setPeriodoId] = useState('')
  const [selectedDims, setSelectedDims] = useState<Set<string>>(new Set())
  const [selectedUnidades, setSelectedUnidades] = useState<Set<string>>(new Set())

  function toggleDim(id: string) {
    setSelectedDims(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleUnidad(id: string) {
    setSelectedUnidades(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleClose() {
    setOpen(false)
    setNombre('')
    setTipo('')
    setFecha('')
    setPeriodoId('')
    setSelectedDims(new Set())
    setSelectedUnidades(new Set())
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const res = await fetch(`/api/v1/materias/${materiaId}/evaluaciones-referencia`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre,
        tipo,
        ...(fecha ? { fecha } : {}),
        ...(periodoId ? { periodo_id: periodoId } : {}),
        ...(selectedDims.size > 0 ? { dimension_ids: [...selectedDims] } : {}),
        ...(selectedUnidades.size > 0 ? { unidad_ids: [...selectedUnidades] } : {}),
      }),
    })

    const json = await res.json()
    setLoading(false)

    if (!res.ok) {
      toast.error(json.error?.message ?? 'Error al crear evaluación')
      return
    }

    toast.success(`"${nombre}" creada`)
    handleClose()
    router.refresh()
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus data-icon="inline-start" />
        Nueva evaluación
      </Button>

      <Sheet open={open} onOpenChange={v => { if (!v) handleClose(); else setOpen(true) }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Nueva evaluación de referencia</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-6 px-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ref-nombre">Nombre *</Label>
              <Input
                id="ref-nombre"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Ej: TPs 1er bimestre"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ref-tipo">Tipo *</Label>
              <Select value={tipo} onValueChange={v => setTipo(v ?? '')}>
                <SelectTrigger id="ref-tipo">
                  <SelectValue placeholder="Seleccionar tipo..." />
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
                <Label htmlFor="ref-periodo">Período</Label>
                <Select value={periodoId} onValueChange={v => setPeriodoId(v ?? '')}>
                  <SelectTrigger id="ref-periodo">
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
                <p className="text-xs text-muted-foreground">Sin selección = nota única sin dimensión</p>
              </div>
            )}

            {unidades.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <Label>Unidades</Label>
                <div className="flex flex-wrap gap-1.5">
                  {unidades.map(u => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggleUnidad(u.id)}
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                        selectedUnidades.has(u.id)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {u.nombre}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ref-fecha">Fecha (opcional)</Label>
              <input
                id="ref-fecha"
                type="date"
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Las notas de referencia son internas — no se publican en la libreta del alumno.
            </p>

            <Button type="submit" disabled={loading || !nombre || !tipo} className="mt-2">
              {loading && <Loader2 data-icon="inline-start" className="animate-spin" />}
              {loading ? 'Creando...' : 'Crear evaluación'}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  )
}
