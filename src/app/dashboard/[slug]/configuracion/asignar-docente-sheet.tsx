'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Loader2, Pencil } from 'lucide-react'
import { toast } from 'sonner'

interface Docente {
  persona_id: string
  nombre: string
}

interface Props {
  materiaId: string
  materiaNombre: string
  docenteActualId: string | undefined
  instId: string
}

const NONE = '__none__'

export default function AsignarDocenteSheet({ materiaId, materiaNombre, docenteActualId, instId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [docenteId, setDocenteId] = useState(docenteActualId ?? NONE)
  const [docentes, setDocentes] = useState<Docente[]>([])
  const [loadingDocentes, setLoadingDocentes] = useState(false)

  useEffect(() => {
    if (!open) return
    setDocenteId(docenteActualId ?? NONE)
    setLoadingDocentes(true)
    fetch(`/api/v1/instituciones/${instId}/usuarios?rol=docente`)
      .then(r => r.json())
      .then(j => setDocentes(j.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingDocentes(false))
  }, [open, instId, docenteActualId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const res = await fetch(`/api/v1/materias/${materiaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        docentes_ids: docenteId && docenteId !== NONE ? [docenteId] : [],
      }),
    })

    const json = await res.json()
    setLoading(false)

    if (!res.ok) {
      toast.error(json.error?.message ?? 'Error al asignar docente')
      return
    }

    toast.success('Docente actualizado')
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="size-7 text-muted-foreground hover:text-foreground"
      >
        <Pencil className="size-3.5" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Asignar docente</SheetTitle>
          </SheetHeader>
          <p className="text-sm text-muted-foreground px-4 mt-1 mb-6">{materiaNombre}</p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4">
            <div className="flex flex-col gap-1.5">
              <Label>Docente</Label>
              <Select
                value={docenteId}
                onValueChange={v => setDocenteId(v ?? NONE)}
                disabled={loadingDocentes}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingDocentes ? 'Cargando...' : 'Sin docente'}>
                    {docenteId && docenteId !== NONE
                      ? (docentes.find(d => d.persona_id === docenteId)?.nombre ?? undefined)
                      : 'Sin docente'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Sin docente</SelectItem>
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
            <Button type="submit" disabled={loading} className="mt-2">
              {loading && <Loader2 data-icon="inline-start" className="animate-spin" />}
              {loading ? 'Guardando...' : 'Guardar'}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  )
}
