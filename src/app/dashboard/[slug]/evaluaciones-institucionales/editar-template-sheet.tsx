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

interface Template {
  id: string
  nombre: string
  tipo: string
  periodo_id: string
  fecha: string | null
  peso: number
  orden: number
}

interface Props {
  template: Template
  instancias: number
  periodos: Array<{ id: string; nombre: string }>
}

export default function EditarTemplateSheet({ template, instancias, periodos }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [nombre, setNombre] = useState(template.nombre)
  const [tipo, setTipo] = useState(template.tipo)
  const [periodoId, setPeriodoId] = useState(template.periodo_id)
  const [fecha, setFecha] = useState(template.fecha ?? '')
  const [sync, setSync] = useState(true)

  function handleOpen(v: boolean) {
    setOpen(v)
    if (v) {
      setNombre(template.nombre)
      setTipo(template.tipo)
      setPeriodoId(template.periodo_id)
      setFecha(template.fecha ?? '')
      setSync(true)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const res = await fetch(`/api/v1/evaluaciones-template/${template.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre,
        tipo,
        periodo_id: periodoId,
        fecha: fecha || null,
        sync,
      }),
    })

    const json = await res.json()
    setSaving(false)

    if (!res.ok) {
      toast.error(json.error?.message ?? 'Error al guardar')
      return
    }

    const synced: number = json.data?.synced ?? 0
    toast.success(sync && synced > 0
      ? `Plantilla actualizada y sincronizada en ${synced} materia${synced !== 1 ? 's' : ''}`
      : 'Plantilla actualizada'
    )
    setOpen(false)
    router.refresh()
  }

  async function handleDelete() {
    setDeleting(true)

    const res = await fetch(`/api/v1/evaluaciones-template/${template.id}`, { method: 'DELETE' })
    const json = await res.json()
    setDeleting(false)

    if (!res.ok) {
      toast.error(json.error?.message ?? 'Error al eliminar')
      return
    }

    toast.success('Plantilla eliminada')
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
        <span className="sr-only">Editar plantilla</span>
      </Button>

      <Sheet open={open} onOpenChange={handleOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Editar plantilla</SheetTitle>
          </SheetHeader>

          <form onSubmit={handleSave} className="flex flex-col gap-4 mt-6 px-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tpl-nombre">Nombre *</Label>
              <Input
                id="tpl-nombre"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tpl-tipo">Tipo *</Label>
              <Select value={tipo} onValueChange={v => setTipo(v ?? tipo)}>
                <SelectTrigger id="tpl-tipo">
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
              <Label htmlFor="tpl-periodo">Período *</Label>
              <Select value={periodoId} onValueChange={v => setPeriodoId(v ?? periodoId)}>
                <SelectTrigger id="tpl-periodo">
                  <SelectValue>
                    {periodos.find(p => p.id === periodoId)?.nombre}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {periodos.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tpl-fecha">Fecha (opcional)</Label>
              <input
                id="tpl-fecha"
                type="date"
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            {instancias > 0 && (
              <label className="flex items-start gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={sync}
                  onChange={e => setSync(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  Actualizar en las {instancias} materia{instancias !== 1 ? 's' : ''} del año activo
                </span>
              </label>
            )}

            <Button
              type="submit"
              disabled={saving || !nombre || !tipo || !periodoId}
              className="mt-2"
            >
              {saving && <Loader2 data-icon="inline-start" className="animate-spin" />}
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </Button>

            <div className="border-t pt-4">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => setConfirmDelete(true)}
                disabled={deleting}
              >
                <Trash2 className="size-3.5 mr-1.5" />
                Eliminar plantilla
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={v => { if (!v) setConfirmDelete(false) }}
        title="¿Eliminar plantilla?"
        description={instancias > 0
          ? `Se eliminará "${template.nombre}" y sus ${instancias} instancia${instancias !== 1 ? 's' : ''} en materias. Esta acción no se puede deshacer.`
          : `Se eliminará la plantilla "${template.nombre}". Esta acción no se puede deshacer.`
        }
        confirmLabel="Eliminar"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
      />
    </>
  )
}
