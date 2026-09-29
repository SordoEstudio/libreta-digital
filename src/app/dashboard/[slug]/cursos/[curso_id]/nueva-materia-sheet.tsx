'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'

interface Docente {
  persona_id: string
  nombre: string
  email: string | null
}

interface Props {
  cursoId: string
  instId: string
}

export default function NuevaMateriaSheet({ cursoId, instId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [nombre, setNombre] = useState('')
  const [docenteId, setDocenteId] = useState('')
  const [docentes, setDocentes] = useState<Docente[]>([])
  const [loadingDocentes, setLoadingDocentes] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoadingDocentes(true)
    fetch(`/api/v1/instituciones/${instId}/usuarios?rol=docente`)
      .then(r => r.json())
      .then(j => setDocentes(j.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingDocentes(false))
  }, [open, instId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const body: Record<string, unknown> = { nombre }
    if (docenteId) body.docentes_ids = [docenteId]

    const res = await fetch(`/api/v1/cursos/${cursoId}/materias`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const json = await res.json()
    setLoading(false)

    if (!res.ok) {
      toast.error(json.error?.message ?? 'Error al crear materia')
      return
    }

    toast.success(`Materia "${nombre}" creada`)
    setOpen(false)
    setNombre('')
    setDocenteId('')
    router.refresh()
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus data-icon="inline-start" />
        Nueva materia
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Nueva materia</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-6 px-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mat-nombre">Nombre *</Label>
              <Input
                id="mat-nombre"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Ej: Matemáticas"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mat-docente">Docente</Label>
              <Select value={docenteId} onValueChange={v => setDocenteId(v ?? '')}>
                <SelectTrigger id="mat-docente" disabled={loadingDocentes}>
                  <SelectValue placeholder={loadingDocentes ? 'Cargando...' : 'Seleccionar docente...'}>
                    {docenteId ? docentes.find(d => d.persona_id === docenteId)?.nombre : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {docentes.map(d => (
                    <SelectItem key={d.persona_id} value={d.persona_id}>
                      {d.nombre}
                    </SelectItem>
                  ))}
                  {docentes.length === 0 && !loadingDocentes && (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      Sin docentes registrados
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" disabled={loading || !nombre} className="mt-2">
              {loading && <Loader2 data-icon="inline-start" className="animate-spin" />}
              {loading ? 'Creando...' : 'Crear materia'}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  )
}
