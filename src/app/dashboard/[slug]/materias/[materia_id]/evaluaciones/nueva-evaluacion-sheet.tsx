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
  { value: 'parcial', label: 'Parcial' },
  { value: 'final', label: 'Final' },
  { value: 'recuperatorio', label: 'Recuperatorio' },
  { value: 'tp', label: 'Trabajo práctico' },
  { value: 'concepto', label: 'Concepto' },
]

interface Props {
  materiaId: string
  periodos: Array<{ id: string; nombre: string; cerrado_at?: string | null }>
  dimensiones: Array<{ id: string; nombre: string }>
  disabled?: boolean
}

export default function NuevaEvaluacionSheet({ materiaId, periodos, dimensiones, disabled }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState('parcial')
  const [periodoId, setPeriodoId] = useState('')
  const [fecha, setFecha] = useState('')
  const [permiteRecuperatorio, setPermiteRecuperatorio] = useState(false)
  const [dimensionIds, setDimensionIds] = useState<string[]>([])

  function toggleDimension(id: string) {
    setDimensionIds(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const res = await fetch(`/api/v1/materias/${materiaId}/evaluaciones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, tipo, periodo_id: periodoId === '__anual__' ? null : periodoId || undefined, permite_recuperatorio: permiteRecuperatorio, ...(fecha ? { fecha } : {}), ...(dimensionIds.length > 0 ? { dimension_ids: dimensionIds } : {}) }),
    })

    const json = await res.json()
    setLoading(false)

    if (!res.ok) {
      toast.error(json.error?.message ?? 'Error al crear evaluación')
      return
    }

    toast.success(`Evaluación "${nombre}" creada`)
    setOpen(false)
    setNombre('')
    setTipo('')
    setPeriodoId('')
    setFecha('')
    setPermiteRecuperatorio(false)
    setDimensionIds([])
    router.refresh()
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={disabled}>
        <Plus data-icon="inline-start" />
        Nueva evaluación
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Nueva evaluación</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-6 px-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ev-nombre">Nombre *</Label>
              <Input
                id="ev-nombre"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Ej: 1er Parcial"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ev-tipo">Tipo *</Label>
              <Select value={tipo} onValueChange={v => setTipo(v ?? '')}>
                <SelectTrigger id="ev-tipo">
                  <SelectValue placeholder="Seleccionar tipo..." />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ev-periodo">Período</Label>
              <Select value={periodoId} onValueChange={v => setPeriodoId(v ?? '')}>
                <SelectTrigger id="ev-periodo">
                  <SelectValue placeholder="Seleccionar período...">
                    {periodoId === '__anual__'
                      ? 'Período Anual'
                      : periodoId ? periodos.find(p => p.id === periodoId)?.nombre : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__anual__">Período Anual</SelectItem>
                  {periodos.map(p => (
                    <SelectItem key={p.id} value={p.id} disabled={!!p.cerrado_at}>
                      {p.nombre}{p.cerrado_at ? ' (cerrado)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ev-fecha">Fecha (opcional)</Label>
              <input
                id="ev-fecha"
                type="date"
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            {dimensiones.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <Label>Dimensiones (opcional)</Label>
                <div className="flex flex-col gap-1.5 rounded-md border px-3 py-2">
                  {dimensiones.map(d => (
                    <label key={d.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={dimensionIds.includes(d.id)}
                        onChange={() => toggleDimension(d.id)}
                        className="size-4 cursor-pointer accent-primary"
                      />
                      {d.nombre}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={permiteRecuperatorio}
                onChange={e => setPermiteRecuperatorio(e.target.checked)}
                className="size-4 cursor-pointer accent-primary"
              />
              <span>Permite recuperatorio</span>
            </label>

            <Button
              type="submit"
              disabled={loading || !nombre || !tipo}
              className="mt-2"
            >
              {loading && <Loader2 data-icon="inline-start" className="animate-spin" />}
              {loading ? 'Creando...' : 'Crear evaluación'}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  )
}
