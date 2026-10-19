'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  ChevronUp, ChevronDown, Trash2, ExternalLink, FileText, ImageIcon, Link2,
  Eye, EyeOff, Pencil, Plus,
} from 'lucide-react'
import { toast } from 'sonner'
import UnidadForm from './unidad-form'
import ItemSheet from './item-sheet'
import type { UnidadConItems, ContenidoItem } from './page'

type Dimension = { id: string; nombre: string }

interface Props {
  unidades: UnidadConItems[]
  dimensiones: Dimension[]
  materiaId: string
  slug: string
  cursoId: string
  isEditor: boolean
}

function ItemTypeIcon({ tipo }: { tipo: ContenidoItem['tipo'] }) {
  if (tipo === 'link')    return <Link2 className="size-4 shrink-0 text-blue-500" />
  if (tipo === 'imagen')  return <ImageIcon className="size-4 shrink-0 text-emerald-500" />
  return <FileText className="size-4 shrink-0 text-amber-500" />
}

export default function ContenidosEditor({ unidades: initialUnidades, dimensiones, materiaId, isEditor }: Props) {
  const router = useRouter()
  const [unidades, setUnidades] = useState(initialUnidades)
  const [addingUnidad, setAddingUnidad] = useState(false)
  const [editingUnidadId, setEditingUnidadId] = useState<string | null>(null)

  async function deleteUnidad(unidadId: string) {
    const res = await fetch(`/api/v1/contenidos/unidades/${unidadId}`, { method: 'DELETE' })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      toast.error(json.error?.message ?? 'Error al eliminar unidad')
      return
    }
    toast.success('Unidad eliminada')
    router.refresh()
  }

  async function toggleUnidadPublicado(unidadId: string, publicado: boolean) {
    const res = await fetch(`/api/v1/contenidos/unidades/${unidadId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicado }),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      toast.error(json.error?.message ?? 'Error al actualizar')
      return
    }
    router.refresh()
  }

  async function deleteItem(unidadId: string, itemId: string) {
    const res = await fetch(`/api/v1/contenidos/items/${itemId}`, { method: 'DELETE' })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      toast.error(json.error?.message ?? 'Error al eliminar item')
      return
    }
    toast.success('Material eliminado')
    router.refresh()
  }

  async function moveItem(unidadId: string, itemIndex: number, direction: 'up' | 'down') {
    const unidad = unidades.find(u => u.id === unidadId)
    if (!unidad) return

    const items = [...unidad.items]
    const targetIndex = direction === 'up' ? itemIndex - 1 : itemIndex + 1
    if (targetIndex < 0 || targetIndex >= items.length) return

    // Optimistic update
    const updated = [...items]
    const [moved] = updated.splice(itemIndex, 1)
    updated.splice(targetIndex, 0, moved)
    const reordered = updated.map((item, i) => ({ ...item, orden: i }))

    setUnidades(prev => prev.map(u =>
      u.id === unidadId ? { ...u, items: reordered } : u
    ))

    const item = reordered[targetIndex]
    const res = await fetch(`/api/v1/contenidos/items/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orden: item.orden }),
    })

    if (!res.ok) {
      toast.error('Error al reordenar')
      // revert
      setUnidades(prev => prev.map(u =>
        u.id === unidadId ? { ...u, items: unidad.items } : u
      ))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {unidades.length === 0 && !addingUnidad && (
        <p className="text-muted-foreground text-sm">Sin unidades todavía.</p>
      )}

      {unidades.map((unidad) => (
        <div key={unidad.id} className="border rounded-lg overflow-hidden">
          {/* Unidad header */}
          <div className="flex items-center gap-2 px-4 py-3 bg-muted/40">
            {editingUnidadId === unidad.id ? (
              <div className="flex-1">
                <UnidadForm
                  mode="edit"
                  unidadId={unidad.id}
                  initialNombre={unidad.nombre}
                  initialDescripcion={unidad.descripcion}
                  onDone={() => setEditingUnidadId(null)}
                />
              </div>
            ) : (
              <>
                <div className="flex-1 min-w-0">
                  <span className="font-medium truncate">{unidad.nombre}</span>
                  {unidad.descripcion && (
                    <p className="text-xs text-muted-foreground truncate">{unidad.descripcion}</p>
                  )}
                </div>
                {!unidad.publicado && (
                  <Badge variant="secondary">Borrador</Badge>
                )}
                {isEditor && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost" size="icon" className="size-7"
                      onClick={() => toggleUnidadPublicado(unidad.id, !unidad.publicado)}
                      title={unidad.publicado ? 'Ocultar' : 'Publicar'}
                    >
                      {unidad.publicado ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="size-7"
                      onClick={() => setEditingUnidadId(unidad.id)}
                      title="Editar unidad"
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="size-7 text-destructive hover:text-destructive"
                      onClick={() => deleteUnidad(unidad.id)}
                      title="Eliminar unidad"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Items */}
          <div className="divide-y">
            {unidad.items.length === 0 && (
              <p className="px-4 py-3 text-sm text-muted-foreground">Sin materiales en esta unidad.</p>
            )}
            {unidad.items.map((item, idx) => (
              <div key={item.id} className="flex items-start gap-3 px-4 py-3">
                <ItemTypeIcon tipo={item.tipo} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {item.tipo === 'link' && item.url ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-sm hover:underline flex items-center gap-1 truncate"
                      >
                        {item.titulo}
                        <ExternalLink className="size-3 shrink-0" />
                      </a>
                    ) : item.signedUrl ? (
                      <a
                        href={item.signedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-sm hover:underline flex items-center gap-1 truncate"
                      >
                        {item.titulo}
                        <ExternalLink className="size-3 shrink-0" />
                      </a>
                    ) : (
                      <span className="font-medium text-sm truncate">{item.titulo}</span>
                    )}
                    {!item.publicado && <Badge variant="secondary" className="text-xs">Borrador</Badge>}
                    {item.dimension_id && dimensiones.find(d => d.id === item.dimension_id) && (
                      <Badge variant="outline" className="text-xs">
                        {dimensiones.find(d => d.id === item.dimension_id)!.nombre}
                      </Badge>
                    )}
                  </div>
                  {item.nota && (
                    <p className="text-xs text-muted-foreground italic mt-0.5">{item.nota}</p>
                  )}
                </div>
                {isEditor && (
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button
                      variant="ghost" size="icon" className="size-6"
                      onClick={() => moveItem(unidad.id, idx, 'up')}
                      disabled={idx === 0}
                      title="Subir"
                    >
                      <ChevronUp className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="size-6"
                      onClick={() => moveItem(unidad.id, idx, 'down')}
                      disabled={idx === unidad.items.length - 1}
                      title="Bajar"
                    >
                      <ChevronDown className="size-3.5" />
                    </Button>
                    <ItemSheet
                      mode="edit"
                      item={item}
                      dimensiones={dimensiones}
                    />
                    <Button
                      variant="ghost" size="icon" className="size-6 text-destructive hover:text-destructive"
                      onClick={() => deleteItem(unidad.id, item.id)}
                      title="Eliminar"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add item */}
          {isEditor && (
            <div className="px-4 py-3 border-t bg-background">
              <ItemSheet
                mode="create"
                unidadId={unidad.id}
                nextOrden={unidad.items.length}
                dimensiones={dimensiones}
              />
            </div>
          )}
        </div>
      ))}

      {/* Add unidad */}
      {isEditor && (
        <div>
          {addingUnidad ? (
            <div className="border rounded-lg p-4">
              <UnidadForm
                mode="create"
                materiaId={materiaId}
                onDone={() => setAddingUnidad(false)}
              />
            </div>
          ) : (
            <Button variant="outline" onClick={() => setAddingUnidad(true)}>
              <Plus data-icon="inline-start" />
              Nueva unidad
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
