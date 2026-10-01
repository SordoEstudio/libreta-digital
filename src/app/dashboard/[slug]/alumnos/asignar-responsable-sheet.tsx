'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Loader2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'

interface Responsable {
  persona_id: string
  nombre: string
  email: string | null
}

interface Props {
  alumnoId: string
  alumnoNombre: string
  instId: string
  open?: boolean
  onOpenChange?: (v: boolean) => void
}

export default function AsignarResponsableSheet({ alumnoId, alumnoNombre, instId, open: openProp, onOpenChange }: Props) {
  const router = useRouter()
  const [openInternal, setOpenInternal] = useState(false)
  const open = openProp ?? openInternal
  const setOpen = onOpenChange ?? setOpenInternal
  const [loading, setLoading] = useState(false)
  const [responsableId, setResponsableId] = useState('')
  const [responsables, setResponsables] = useState<Responsable[]>([])
  const [loadingResp, setLoadingResp] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoadingResp(true)
    fetch(`/api/v1/instituciones/${instId}/usuarios?rol=responsable`)
      .then(r => r.json())
      .then(j => setResponsables(j.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingResp(false))
  }, [open, instId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!responsableId) return
    setLoading(true)

    const res = await fetch(`/api/v1/alumnos/${alumnoId}/responsables`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ persona_id: responsableId }),
    })

    const json = await res.json()
    setLoading(false)

    if (!res.ok) {
      toast.error(json.error?.message ?? 'Error al asignar responsable')
      return
    }

    toast.success('Responsable asignado')
    setOpen(false)
    setResponsableId('')
    router.refresh()
  }

  return (
    <>
      {!onOpenChange && (
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
          <UserPlus className="size-3.5" />
          Responsable
        </Button>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Asignar responsable</SheetTitle>
          </SheetHeader>
          <div className="mt-2 px-4 text-sm text-muted-foreground">
            Alumno: <strong>{alumnoNombre}</strong>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-6 px-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="resp-select">Responsable *</Label>
              <Select value={responsableId} onValueChange={v => setResponsableId(v ?? '')}>
                <SelectTrigger id="resp-select" disabled={loadingResp}>
                  <SelectValue placeholder={loadingResp ? 'Cargando...' : 'Seleccionar responsable...'}>
                    {responsableId ? responsables.find(r => r.persona_id === responsableId)?.nombre : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {responsables.map(r => (
                    <SelectItem key={r.persona_id} value={r.persona_id}>
                      <span>{r.nombre}</span>
                      {r.email && <span className="text-xs text-muted-foreground ml-2">{r.email}</span>}
                    </SelectItem>
                  ))}
                  {responsables.length === 0 && !loadingResp && (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      Sin responsables registrados
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" disabled={loading || !responsableId} className="mt-2">
              {loading && <Loader2 data-icon="inline-start" className="animate-spin" />}
              {loading ? 'Asignando...' : 'Asignar responsable'}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  )
}
