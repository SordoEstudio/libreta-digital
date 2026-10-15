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

interface Props {
  materiaId: string
}

export default function NuevaEvalRefSheet({ materiaId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState('')
  const [fecha, setFecha] = useState('')

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
      }),
    })

    const json = await res.json()
    setLoading(false)

    if (!res.ok) {
      toast.error(json.error?.message ?? 'Error al crear evaluación')
      return
    }

    toast.success(`"${nombre}" creada`)
    setOpen(false)
    setNombre('')
    setTipo('')
    setFecha('')
    router.refresh()
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus data-icon="inline-start" />
        Nueva evaluación
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
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
                placeholder="Ej: Lecturas 1er bimestre"
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
