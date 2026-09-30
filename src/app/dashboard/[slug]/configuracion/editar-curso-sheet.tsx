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

const NIVELES = ['Primario', 'Secundario', 'Terciario', 'Universitario']
const TURNOS = [
  { value: 'mañana', label: 'Mañana' },
  { value: 'tarde', label: 'Tarde' },
  { value: 'noche', label: 'Noche' },
]

interface Props {
  cursoId: string
  initialNombre: string
  initialNivel: string | null
  initialTurno: string | null
}

export default function EditarCursoSheet({ cursoId, initialNombre, initialNivel, initialTurno }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [nombre, setNombre] = useState(initialNombre)
  const [nivel, setNivel] = useState(initialNivel ?? '')
  const [turno, setTurno] = useState(initialTurno ?? '')

  function handleOpen() {
    setNombre(initialNombre)
    setNivel(initialNivel ?? '')
    setTurno(initialTurno ?? '')
    setOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const body: Record<string, string | null> = { nombre }
    body.nivel = nivel || null
    body.turno = turno || null

    const res = await fetch(`/api/v1/cursos/${cursoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const json = await res.json()
    setLoading(false)

    if (!res.ok) {
      toast.error(json.error?.message ?? 'Error al editar curso')
      return
    }

    toast.success('Curso actualizado')
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleOpen}
        className="size-6 text-muted-foreground hover:text-foreground"
      >
        <Pencil className="size-3" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Editar curso</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-6 px-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ec-nombre">Nombre *</Label>
              <Input
                id="ec-nombre"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Nivel</Label>
              <Select value={nivel} onValueChange={v => setNivel(v === '__none__' ? '' : (v ?? ''))}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin nivel">
                    {nivel || 'Sin nivel'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin nivel</SelectItem>
                  {NIVELES.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Turno</Label>
              <Select value={turno} onValueChange={v => setTurno(v === '__none__' ? '' : (v ?? ''))}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin turno">
                    {turno ? TURNOS.find(t => t.value === turno)?.label : 'Sin turno'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin turno</SelectItem>
                  {TURNOS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" disabled={loading || !nombre} className="mt-2">
              {loading && <Loader2 data-icon="inline-start" className="animate-spin" />}
              {loading ? 'Guardando...' : 'Guardar'}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  )
}
