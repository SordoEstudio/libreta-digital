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

const PLANTILLAS = [
  { value: 'ninguna', label: 'Sin períodos' },
  { value: 'trimestral', label: 'Trimestral (1er, 2do, 3er trimestre)' },
  { value: 'semestral', label: 'Semestral (1er, 2do semestre)' },
  { value: 'bimestral', label: 'Bimestral (1er, 2do, 3er, 4to bimestre)' },
]

const PERIODOS_PLANTILLA: Record<string, string[]> = {
  trimestral: ['1er Trimestre', '2do Trimestre', '3er Trimestre'],
  semestral: ['1er Semestre', '2do Semestre'],
  bimestral: ['1er Bimestre', '2do Bimestre', '3er Bimestre', '4to Bimestre'],
}

interface Props {
  instId: string
}

export default function NuevoAñoSheet({ instId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [nombre, setNombre] = useState('')
  const [activo, setActivo] = useState(false)
  const [plantilla, setPlantilla] = useState('trimestral')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const añoRes = await fetch(`/api/v1/instituciones/${instId}/años-lectivos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, activo }),
    })
    const añoJson = await añoRes.json()

    if (!añoRes.ok) {
      toast.error(añoJson.error?.message ?? 'Error al crear año lectivo')
      setLoading(false)
      return
    }

    const añoId = añoJson.data.id
    const periodos = PERIODOS_PLANTILLA[plantilla] ?? []

    for (let i = 0; i < periodos.length; i++) {
      await fetch(`/api/v1/instituciones/${instId}/periodos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ año_lectivo_id: añoId, nombre: periodos[i], orden: i + 1 }),
      })
    }

    toast.success(`Año lectivo "${nombre}" creado`)
    setOpen(false)
    setNombre('')
    setActivo(false)
    setPlantilla('trimestral')
    setLoading(false)
    router.refresh()
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus data-icon="inline-start" />
        Nuevo año lectivo
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Nuevo año lectivo</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-6 px-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="año-nombre">Nombre *</Label>
              <Input
                id="año-nombre"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Ej: 2026"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="año-plantilla">Períodos predefinidos</Label>
              <Select value={plantilla} onValueChange={v => setPlantilla(v ?? 'ninguna')}>
                <SelectTrigger id="año-plantilla">
                  <SelectValue>
                    {PLANTILLAS.find(p => p.value === plantilla)?.label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PLANTILLAS.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="año-activo"
                type="checkbox"
                checked={activo}
                onChange={e => setActivo(e.target.checked)}
                className="size-4"
              />
              <Label htmlFor="año-activo">Marcar como año activo</Label>
            </div>

            <Button type="submit" disabled={loading || !nombre} className="mt-2">
              {loading && <Loader2 data-icon="inline-start" className="animate-spin" />}
              {loading ? 'Creando...' : 'Crear año lectivo'}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  )
}
