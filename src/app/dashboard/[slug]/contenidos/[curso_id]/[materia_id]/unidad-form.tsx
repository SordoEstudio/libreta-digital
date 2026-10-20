'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface CreateProps {
  mode: 'create'
  materiaId: string
  nextOrden?: number
  onDone?: () => void
}

interface EditProps {
  mode: 'edit'
  unidadId: string
  initialNombre: string
  initialDescripcion: string | null
  onDone?: () => void
}

type Props = CreateProps | EditProps

export default function UnidadForm(props: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [nombre, setNombre] = useState(props.mode === 'edit' ? props.initialNombre : '')
  const [descripcion, setDescripcion] = useState(
    props.mode === 'edit' ? (props.initialDescripcion ?? '') : ''
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    let res: Response
    if (props.mode === 'create') {
      res = await fetch('/api/v1/contenidos/unidades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materia_id: props.materiaId, nombre, descripcion: descripcion || null, orden: props.nextOrden ?? 0 }),
      })
    } else {
      res = await fetch(`/api/v1/contenidos/unidades/${props.unidadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, descripcion: descripcion || null }),
      })
    }

    const json = await res.json()
    setLoading(false)

    if (!res.ok) {
      toast.error(json.error?.message ?? 'Error al guardar unidad')
      return
    }

    toast.success(props.mode === 'create' ? 'Unidad creada' : 'Unidad actualizada')
    if (props.mode === 'create') {
      setNombre('')
      setDescripcion('')
    }
    props.onDone?.()
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="unidad-nombre">Nombre *</Label>
        <Input
          id="unidad-nombre"
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          placeholder="Ej: Unidad 1 — Introducción"
          maxLength={120}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="unidad-desc">Descripción</Label>
        <Input
          id="unidad-desc"
          value={descripcion}
          onChange={e => setDescripcion(e.target.value)}
          placeholder="Descripción opcional"
          maxLength={500}
        />
      </div>
      <Button type="submit" disabled={loading || !nombre.trim()} size="sm">
        {loading && <Loader2 data-icon="inline-start" className="animate-spin" />}
        {loading ? 'Guardando...' : props.mode === 'create' ? 'Crear unidad' : 'Guardar'}
      </Button>
    </form>
  )
}
