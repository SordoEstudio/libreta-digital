'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { ContenidoItem } from './page'

type Dimension = { id: string; nombre: string }

interface CreateProps {
  mode: 'create'
  unidadId: string
  nextOrden: number
  dimensiones: Dimension[]
}

interface EditProps {
  mode: 'edit'
  item: ContenidoItem
  dimensiones: Dimension[]
}

type Props = CreateProps | EditProps

export default function ItemSheet(props: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const [tipo, setTipo] = useState<'link' | 'archivo' | 'imagen'>(
    props.mode === 'edit' ? props.item.tipo : 'link'
  )
  const [titulo, setTitulo] = useState(props.mode === 'edit' ? props.item.titulo : '')
  const [url, setUrl] = useState(props.mode === 'edit' ? (props.item.url ?? '') : '')
  const [nota, setNota] = useState(props.mode === 'edit' ? (props.item.nota ?? '') : '')
  const [dimensionId, setDimensionId] = useState(
    props.mode === 'edit' ? (props.item.dimension_id ?? '') : ''
  )
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  // Reset form state when sheet opens in create mode
  useEffect(() => {
    if (!open || props.mode !== 'create') return
    setTipo('link')
    setTitulo('')
    setUrl('')
    setNota('')
    setDimensionId('')
    setFile(null)
  }, [open, props.mode])

  async function handleDelete() {
    if (props.mode !== 'edit') return
    const res = await fetch(`/api/v1/contenidos/items/${props.item.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      toast.error(json.error?.message ?? 'Error al eliminar')
      return
    }
    toast.success('Material eliminado')
    setOpen(false)
    router.refresh()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (tipo === 'link') {
      setLoading(true)
      let res: Response
      if (props.mode === 'create') {
        res = await fetch('/api/v1/contenidos/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            unidad_id: props.unidadId,
            tipo: 'link',
            titulo,
            url,
            nota: nota || null,
            dimension_id: dimensionId || null,
            orden: props.nextOrden,
          }),
        })
      } else {
        res = await fetch(`/api/v1/contenidos/items/${props.item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            titulo,
            url,
            nota: nota || null,
            dimension_id: dimensionId || null,
          }),
        })
      }
      const json = await res.json()
      setLoading(false)
      if (!res.ok) { toast.error(json.error?.message ?? 'Error al guardar'); return }
    } else {
      if (props.mode === 'create' && !file) { toast.error('Seleccioná un archivo'); return }
      if (file) {
        setUploading(true)
        const fd = new FormData()
        fd.append('file', file)
        fd.append('unidad_id', props.mode === 'create' ? props.unidadId : '')
        fd.append('titulo', titulo)
        if (nota) fd.append('nota', nota)
        if (dimensionId) fd.append('dimension_id', dimensionId)
        if (props.mode === 'create') fd.append('orden', String(props.nextOrden))

        const uploadRes = await fetch('/api/v1/contenidos/items/upload', { method: 'POST', body: fd })
        const uploadJson = await uploadRes.json()
        setUploading(false)
        if (!uploadRes.ok) { toast.error(uploadJson.error?.message ?? 'Error al subir archivo'); return }
      } else if (props.mode === 'edit') {
        setLoading(true)
        const res = await fetch(`/api/v1/contenidos/items/${props.item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ titulo, nota: nota || null, dimension_id: dimensionId || null }),
        })
        const json = await res.json()
        setLoading(false)
        if (!res.ok) { toast.error(json.error?.message ?? 'Error al guardar'); return }
      }
    }

    toast.success(props.mode === 'create' ? 'Material agregado' : 'Material actualizado')
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      {props.mode === 'create' ? (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Plus data-icon="inline-start" />
          Agregar material
        </Button>
      ) : (
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>Editar</Button>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{props.mode === 'create' ? 'Agregar material' : 'Editar material'}</SheetTitle>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-6 px-4">
            {props.mode === 'create' && (
              <div className="flex flex-col gap-1.5">
                <Label>Tipo</Label>
                <Tabs value={tipo} onValueChange={v => setTipo(v as typeof tipo)}>
                  <TabsList>
                    <TabsTrigger value="link">Enlace</TabsTrigger>
                    <TabsTrigger value="archivo">Archivo</TabsTrigger>
                    <TabsTrigger value="imagen">Imagen</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="item-titulo">Título *</Label>
              <Input
                id="item-titulo"
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                placeholder="Ej: Introducción a los verbos"
                maxLength={200}
                required
              />
            </div>

            {tipo === 'link' && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="item-url">URL *</Label>
                <Input
                  id="item-url"
                  type="url"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://..."
                  required
                />
              </div>
            )}

            {(tipo === 'archivo' || tipo === 'imagen') && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="item-file">
                  {tipo === 'imagen' ? 'Imagen' : 'Archivo'}
                  {props.mode === 'create' && ' *'}
                </Label>
                <Input
                  id="item-file"
                  type="file"
                  accept={tipo === 'imagen'
                    ? 'image/jpeg,image/png,image/gif,image/webp'
                    : 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain'
                  }
                  onChange={e => setFile(e.target.files?.[0] ?? null)}
                  required={props.mode === 'create'}
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="item-nota">Nota del docente</Label>
              <Input
                id="item-nota"
                value={nota}
                onChange={e => setNota(e.target.value)}
                placeholder="Comentario opcional"
                maxLength={1000}
              />
            </div>

            {props.dimensiones.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <Label>Dimensión</Label>
                <Select value={dimensionId || 'none'} onValueChange={v => setDimensionId(!v || v === 'none' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue>
                      {!dimensionId ? 'Sin dimensión' : props.dimensiones.find(d => d.id === dimensionId)?.nombre ?? 'Sin dimensión'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin dimensión</SelectItem>
                    {props.dimensiones.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button type="submit" disabled={loading || uploading || !titulo.trim()}>
              {(loading || uploading) && <Loader2 data-icon="inline-start" className="animate-spin" />}
              {uploading ? 'Subiendo...' : loading ? 'Guardando...' : props.mode === 'create' ? 'Agregar' : 'Guardar'}
            </Button>

            {props.mode === 'edit' && (
              <div className="border-t pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-destructive hover:text-destructive"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 data-icon="inline-start" />
                  Eliminar material
                </Button>
              </div>
            )}
          </form>
        </SheetContent>
      </Sheet>

      {props.mode === 'edit' && (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="¿Eliminar material?"
          description="Esta acción no se puede deshacer."
          confirmLabel="Eliminar"
          destructive
          onConfirm={handleDelete}
        />
      )}
    </>
  )
}
