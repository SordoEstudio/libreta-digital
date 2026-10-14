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
  instId: string
  periodos: Array<{ id: string; nombre: string; isActive: boolean }>
}

export default function NuevaTemplateSheet({ instId, periodos }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState('')
  const [periodoId, setPeriodoId] = useState('')
  const [fecha, setFecha] = useState('')
  const [permiteRecuperatorio, setPermiteRecuperatorio] = useState(false)

  const activePeriodos = periodos.filter(p => p.isActive)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const res = await fetch(`/api/v1/instituciones/${instId}/evaluaciones-template`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre,
        tipo,
        periodo_id: periodoId === '__anual__' ? null : periodoId || undefined,
        permite_recuperatorio: permiteRecuperatorio,
        ...(fecha ? { fecha } : {}),
      }),
    })

    const json = await res.json()
    setLoading(false)

    if (!res.ok) {
      toast.error(json.error?.message ?? 'Error al crear plantilla')
      return
    }

    const propagated: number = json.data?.propagated ?? 0
    toast.success(`Plantilla creada y aplicada a ${propagated} materia${propagated !== 1 ? 's' : ''}`)
    setOpen(false)
    setNombre('')
    setTipo('')
    setPeriodoId('')
    setFecha('')
    setPermiteRecuperatorio(false)
    router.refresh()
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus data-icon="inline-start" />
        Nueva plantilla
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Nueva evaluación institucional</SheetTitle>
          </SheetHeader>
          <p className="text-sm text-muted-foreground mt-2 px-4">
            Se creará automáticamente en todas las materias del año activo.
          </p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-6 px-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tpl-nombre">Nombre *</Label>
              <Input
                id="tpl-nombre"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Ej: 1er Parcial"
                required
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tpl-tipo">Tipo *</Label>
              <Select value={tipo} onValueChange={v => setTipo(v ?? '')}>
                <SelectTrigger id="tpl-tipo">
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
              <Label htmlFor="tpl-periodo">Período</Label>
              <Select value={periodoId} onValueChange={v => setPeriodoId(v ?? '')}>
                <SelectTrigger id="tpl-periodo">
                  <SelectValue placeholder="Seleccionar período...">
                    {periodoId === '__anual__'
                      ? 'Sin período — evaluación anual'
                      : periodoId ? activePeriodos.find(p => p.id === periodoId)?.nombre : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__anual__">Sin período — evaluación anual</SelectItem>
                  {activePeriodos.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">Sin períodos activos</div>
                  ) : (
                    activePeriodos.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tpl-fecha">Fecha (opcional)</Label>
              <input
                id="tpl-fecha"
                type="date"
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

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
              {loading ? 'Creando...' : 'Crear y propagar'}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  )
}
