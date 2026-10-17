'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Loader2, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

const TIPOS = [
  { value: 'numerica', label: 'Numérica' },
  { value: 'conceptual', label: 'Conceptual' },
]

interface Periodo { id: string; nombre: string; orden: number }
interface Dimension { id: string; nombre: string; orden: number }
interface Unidad { id: string; nombre: string }

interface Props {
  evalRefId: string
  initialNombre: string
  initialTipo: 'numerica' | 'conceptual'
  initialFecha: string | null
  initialPeriodoId: string | null
  initialDimensionIds: string[]
  initialUnidadIds?: string[]
  periodos: Periodo[]
  dimensiones: Dimension[]
  unidades?: Unidad[]
}

export default function EditarEvalRefSheet({
  evalRefId,
  initialNombre,
  initialTipo,
  initialFecha,
  initialPeriodoId,
  initialDimensionIds,
  initialUnidadIds = [],
  periodos,
  dimensiones,
  unidades = [],
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleEliminar() {
    setDeleting(true)
    const res = await fetch(`/api/v1/evaluaciones-referencia/${evalRefId}`, { method: 'DELETE' })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      toast.error(json.error?.message ?? 'Error al eliminar')
      setDeleting(false)
      return
    }
    toast.success(`"${initialNombre}" eliminada`)
    setDeleting(false)
    setOpen(false)
    router.refresh()
  }
  const [nombre, setNombre] = useState(initialNombre)
  const [tipo, setTipo] = useState(initialTipo)
  const [fecha, setFecha] = useState(initialFecha ?? '')
  const [periodoId, setPeriodoId] = useState(initialPeriodoId ?? '')
  const [selectedDims, setSelectedDims] = useState<Set<string>>(new Set(initialDimensionIds))
  const [selectedUnidades, setSelectedUnidades] = useState<Set<string>>(new Set(initialUnidadIds))

  function handleOpen() {
    setNombre(initialNombre)
    setTipo(initialTipo)
    setFecha(initialFecha ?? '')
    setPeriodoId(initialPeriodoId ?? '')
    setSelectedDims(new Set(initialDimensionIds))
    setSelectedUnidades(new Set(initialUnidadIds))
    setOpen(true)
  }

  function toggleDim(id: string) {
    setSelectedDims(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleUnidad(id: string) {
    setSelectedUnidades(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const res = await fetch(`/api/v1/evaluaciones-referencia/${evalRefId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre,
        tipo,
        fecha: fecha || null,
        periodo_id: periodoId || null,
        dimension_ids: [...selectedDims],
        unidad_ids: [...selectedUnidades],
      }),
    })

    const json = await res.json()
    setLoading(false)

    if (!res.ok) {
      toast.error(json.error?.message ?? 'Error al guardar')
      return
    }

    toast.success('Evaluación actualizada')
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <Button variant="ghost" size="icon" className="size-7" onClick={handleOpen}>
        <Pencil className="size-3.5" />
        <span className="sr-only">Editar {initialNombre}</span>
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Editar evaluación de referencia</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-6 px-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-ref-nombre">Nombre *</Label>
              <Input
                id="edit-ref-nombre"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-ref-tipo">Tipo *</Label>
              <Select value={tipo} onValueChange={v => setTipo(v as 'numerica' | 'conceptual')}>
                <SelectTrigger id="edit-ref-tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {periodos.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-ref-periodo">Período</Label>
                <Select value={periodoId} onValueChange={v => setPeriodoId(v ?? '')}>
                  <SelectTrigger id="edit-ref-periodo">
                    <SelectValue placeholder="Sin período">
                    {periodoId ? periodos.find(p => p.id === periodoId)?.nombre : undefined}
                  </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin período</SelectItem>
                    {periodos.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {dimensiones.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <Label>Dimensiones</Label>
                <div className="flex flex-wrap gap-1.5">
                  {dimensiones.map(d => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => toggleDim(d.id)}
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                        selectedDims.has(d.id)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {d.nombre}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {unidades.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <Label>Unidades</Label>
                <div className="flex flex-wrap gap-1.5">
                  {unidades.map(u => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggleUnidad(u.id)}
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                        selectedUnidades.has(u.id)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {u.nombre}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-ref-fecha">Fecha (opcional)</Label>
              <input
                id="edit-ref-fecha"
                type="date"
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <Button type="submit" disabled={loading || !nombre || !tipo} className="mt-2">
              {loading && <Loader2 data-icon="inline-start" className="animate-spin" />}
              {loading ? 'Guardando...' : 'Guardar cambios'}
            </Button>

            <div className="border-t pt-4 mt-2">
              <AlertDialog>
                <AlertDialogTrigger render={<Button type="button" variant="ghost" className="w-full text-destructive/70 hover:text-destructive hover:bg-destructive/10" />}>
                  <Trash2 data-icon="inline-start" className="size-4" />
                  Eliminar evaluación
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar "{initialNombre}"?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Se eliminarán también las notas cargadas para esta evaluación. Esta acción no se puede deshacer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleEliminar} disabled={deleting} variant="destructive">
                      {deleting && <Loader2 data-icon="inline-start" className="animate-spin" />}
                      Eliminar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </>
  )
}
