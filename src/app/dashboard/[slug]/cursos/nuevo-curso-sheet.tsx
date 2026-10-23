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

const NIVELES = ['I', 'II', 'III', 'IV', 'V', 'VI']
const TURNOS = [
  { value: 'mañana', label: 'Mañana' },
  { value: 'tarde', label: 'Tarde' },
  { value: 'noche', label: 'Noche' },
]

interface Props {
  instId: string
  añoLectivoId: string
}

export default function NuevoCursoSheet({ instId, añoLectivoId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [nombre, setNombre] = useState('')
  const [nivel, setNivel] = useState('')
  const [turno, setTurno] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const body: Record<string, string> = { nombre, año_lectivo_id: añoLectivoId }
    if (nivel) body.nivel = nivel
    if (turno) body.turno = turno

    const res = await fetch(`/api/v1/instituciones/${instId}/cursos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const json = await res.json()
    setLoading(false)

    if (!res.ok) {
      toast.error(json.error?.message ?? 'Error al crear curso')
      return
    }

    toast.success(`Curso "${nombre}" creado`)
    setOpen(false)
    setNombre('')
    setNivel('')
    setTurno('')
    router.refresh()
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus data-icon="inline-start" />
        Nuevo curso
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Nuevo curso</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-6 px-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="curso-nombre">Nombre *</Label>
              <Input
                id="curso-nombre"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Ej: 3° A"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="curso-nivel">Nivel</Label>
              <Select value={nivel} onValueChange={v => setNivel(v ?? '')}>
                <SelectTrigger id="curso-nivel">
                  <SelectValue placeholder="Seleccionar nivel..." />
                </SelectTrigger>
                <SelectContent>
                  {NIVELES.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="curso-turno">Turno</Label>
              <Select value={turno} onValueChange={v => setTurno(v ?? '')}>
                <SelectTrigger id="curso-turno">
                  <SelectValue placeholder="Seleccionar turno..." />
                </SelectTrigger>
                <SelectContent>
                  {TURNOS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" disabled={loading || !nombre} className="mt-2">
              {loading && <Loader2 data-icon="inline-start" className="animate-spin" />}
              {loading ? 'Creando...' : 'Crear curso'}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  )
}
