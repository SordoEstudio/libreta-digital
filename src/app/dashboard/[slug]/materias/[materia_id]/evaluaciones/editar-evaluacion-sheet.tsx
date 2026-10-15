'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Loader2, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

const TIPOS = [
  { value: 'parcial', label: 'Parcial' },
  { value: 'final', label: 'Final' },
  { value: 'recuperatorio', label: 'Recuperatorio' },
  { value: 'tp', label: 'Trabajo práctico' },
  { value: 'concepto', label: 'Concepto' },
]

interface Evaluacion {
  id: string
  nombre: string
  tipo: string
  periodo_id: string | null
  fecha: string | null
  template_id: string | null
  permite_recuperatorio: boolean
  dimension_ids: string[]
}

interface Props {
  evaluacion: Evaluacion
  periodos: Array<{ id: string; nombre: string }>
  dimensiones: Array<{ id: string; nombre: string }>
  isAdmin: boolean
}

export default function EditarEvaluacionSheet({ evaluacion, periodos, dimensiones, isAdmin }: Props) {
  const isInstitucional = !!evaluacion.template_id && !isAdmin
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [nombre, setNombre] = useState(evaluacion.nombre)
  const [tipo, setTipo] = useState(evaluacion.tipo)
  const [periodoId, setPeriodoId] = useState(evaluacion.periodo_id ?? '__anual__')
  const [fecha, setFecha] = useState(evaluacion.fecha ?? '')
  const [permiteRecuperatorio, setPermiteRecuperatorio] = useState(evaluacion.permite_recuperatorio)
  const [dimensionIds, setDimensionIds] = useState<string[]>(evaluacion.dimension_ids)

  function toggleDimension(id: string) {
    setDimensionIds(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id])
  }

  function handleOpen(v: boolean) {
    setOpen(v)
    if (v) {
      setNombre(evaluacion.nombre)
      setTipo(evaluacion.tipo)
      setPeriodoId(evaluacion.periodo_id ?? '__anual__')
      setFecha(evaluacion.fecha ?? '')
      setPermiteRecuperatorio(evaluacion.permite_recuperatorio)
      setDimensionIds(evaluacion.dimension_ids)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const res = await fetch(`/api/v1/evaluaciones/${evaluacion.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre,
        tipo,
        periodo_id: periodoId === '__anual__' ? null : periodoId,
        fecha: fecha || null,
        permite_recuperatorio: permiteRecuperatorio,
        dimension_ids: dimensionIds,
      }),
    })

    const json = await res.json()
    setSaving(false)

    if (!res.ok) {
      toast.error(json.error?.message ?? 'Error al guardar')
      return
    }

    toast.success('Evaluación actualizada')
    setOpen(false)
    router.refresh()
  }

  async function handleDelete() {
    setDeleting(true)

    const res = await fetch(`/api/v1/evaluaciones/${evaluacion.id}`, { method: 'DELETE' })
    const json = await res.json()
    setDeleting(false)

    if (!res.ok) {
      toast.error(json.error?.message ?? 'Error al eliminar')
      return
    }

    toast.success('Evaluación eliminada')
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="size-7 p-0 text-muted-foreground hover:text-foreground"
        onClick={() => handleOpen(true)}
      >
        <Pencil className="size-3.5" />
        <span className="sr-only">Editar evaluación</span>
      </Button>

      <Sheet open={open} onOpenChange={handleOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Editar evaluación</SheetTitle>
          </SheetHeader>

          <form onSubmit={handleSave} className="flex flex-col gap-4 mt-6 px-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ev-nombre">Nombre *</Label>
              <Input
                id="ev-nombre"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ev-tipo">Tipo *</Label>
              <Select value={tipo} onValueChange={v => setTipo(v ?? tipo)}>
                <SelectTrigger id="ev-tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ev-periodo">Período</Label>
              <Select value={periodoId} onValueChange={v => setPeriodoId(v ?? periodoId)}>
                <SelectTrigger id="ev-periodo">
                  <SelectValue>
                    {periodoId === '__anual__'
                      ? 'Sin período — evaluación anual'
                      : periodos.find(p => p.id === periodoId)?.nombre}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__anual__">Sin período — evaluación anual</SelectItem>
                  {periodos.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ev-fecha">Fecha (opcional)</Label>
              <input
                id="ev-fecha"
                type="date"
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            {dimensiones.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <Label>Dimensiones (opcional)</Label>
                <div className="flex flex-col gap-1.5 rounded-md border px-3 py-2">
                  {dimensiones.map(d => (
                    <label key={d.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={dimensionIds.includes(d.id)}
                        onChange={() => toggleDimension(d.id)}
                        className="size-4 cursor-pointer accent-primary"
                      />
                      {d.nombre}
                    </label>
                  ))}
                </div>
              </div>
            )}

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
              disabled={saving || !nombre || !tipo}
              className="mt-2"
            >
              {saving && <Loader2 data-icon="inline-start" className="animate-spin" />}
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </Button>

            <div className="border-t pt-4">
              {isInstitucional ? (
                <p className="text-xs text-muted-foreground text-center">
                  Evaluación institucional — solo el administrador puede eliminarla.
                </p>
              ) : (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={() => setConfirmDelete(true)}
                  disabled={deleting}
                >
                  <Trash2 className="size-3.5 mr-1.5" />
                  Eliminar evaluación
                </Button>
              )}
            </div>
          </form>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={v => { if (!v) setConfirmDelete(false) }}
        title="¿Eliminar evaluación?"
        description={`Se eliminarán "${evaluacion.nombre}" y todas sus notas. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
      />
    </>
  )
}
