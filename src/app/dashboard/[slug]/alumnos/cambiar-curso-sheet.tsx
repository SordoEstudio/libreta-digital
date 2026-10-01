'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  alumnoId: string
  alumnoNombre: string
  cursos: Array<{ id: string; nombre: string }>
  open: boolean
  onOpenChange: (v: boolean) => void
}

export default function CambiarCursoSheet({ alumnoId, alumnoNombre, cursos, open, onOpenChange }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [cursoId, setCursoId] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!cursoId) return
    setLoading(true)

    const res = await fetch(`/api/v1/alumnos/${alumnoId}/inscripciones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ curso_id: cursoId }),
    })

    const json = await res.json()
    setLoading(false)

    if (!res.ok) {
      toast.error(json.error?.message ?? 'Error al cambiar curso')
      return
    }

    toast.success('Curso actualizado')
    onOpenChange(false)
    setCursoId('')
    router.refresh()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Cambiar curso</SheetTitle>
        </SheetHeader>
        <div className="mt-2 px-4 text-sm text-muted-foreground">
          Alumno: <strong>{alumnoNombre}</strong>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-6 px-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cc-curso">Nuevo curso *</Label>
            <Select value={cursoId} onValueChange={v => setCursoId(v ?? '')}>
              <SelectTrigger id="cc-curso">
                <SelectValue placeholder="Seleccionar curso...">
                  {cursoId ? cursos.find(c => c.id === cursoId)?.nombre : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {cursos.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                ))}
                {cursos.length === 0 && (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">Sin cursos disponibles</div>
                )}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={loading || !cursoId} className="mt-2">
            {loading && <Loader2 data-icon="inline-start" className="animate-spin" />}
            {loading ? 'Cambiando...' : 'Cambiar curso'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
