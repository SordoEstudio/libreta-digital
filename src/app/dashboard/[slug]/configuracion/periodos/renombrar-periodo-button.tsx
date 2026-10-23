'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pencil, Check, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  instId: string
  periodoId: string
  periodoNombre: string
}

export default function RenombrarPeriodoButton({ instId, periodoId, periodoNombre }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [nombre, setNombre] = useState(periodoNombre)
  const [loading, setLoading] = useState(false)

  function handleCancel() {
    setNombre(periodoNombre)
    setEditing(false)
  }

  async function handleSave() {
    if (!nombre.trim() || nombre.trim() === periodoNombre) {
      setEditing(false)
      return
    }
    setLoading(true)
    const res = await fetch(`/api/v1/instituciones/${instId}/periodos/${periodoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: nombre.trim() }),
    })
    setLoading(false)
    if (res.ok) {
      toast.success('Período renombrado')
      setEditing(false)
      router.refresh()
    } else {
      const json = await res.json().catch(() => ({}))
      toast.error(json.error?.message ?? 'Error al renombrar')
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); void handleSave() }
            if (e.key === 'Escape') handleCancel()
          }}
          className="h-7 text-sm w-44"
          autoFocus
        />
        <Button size="icon" variant="ghost" className="size-7" onClick={() => void handleSave()} disabled={loading}>
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5 text-green-600" />}
        </Button>
        <Button size="icon" variant="ghost" className="size-7" onClick={handleCancel} disabled={loading}>
          <X className="size-3.5" />
        </Button>
      </div>
    )
  }

  return (
    <Button
      size="icon"
      variant="ghost"
      className="size-7 text-muted-foreground hover:text-foreground"
      onClick={() => setEditing(true)}
      title="Renombrar período"
    >
      <Pencil className="size-3.5" />
    </Button>
  )
}
