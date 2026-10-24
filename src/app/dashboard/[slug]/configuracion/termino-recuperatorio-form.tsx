'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface Props {
  instId: string
  value: string
}

export default function TerminoRecuperatorioForm({ instId, value }: Props) {
  const router = useRouter()
  const [termino, setTermino] = useState(value)
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    if (!termino.trim()) return
    setLoading(true)
    const res = await fetch(`/api/v1/instituciones/${instId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ termino_recuperatorio: termino.trim() }),
    })
    setLoading(false)
    if (res.ok) {
      toast.success('Término actualizado')
      router.refresh()
    } else {
      const json = await res.json()
      toast.error(json.error?.message ?? 'Error al actualizar')
    }
  }

  return (
    <div className="flex gap-2">
      <Input
        value={termino}
        onChange={e => setTermino(e.target.value)}
        className="max-w-xs"
        placeholder="Ej: Recuperatorio"
      />
      <Button
        variant="outline"
        size="sm"
        onClick={handleSave}
        disabled={loading || !termino.trim() || termino.trim() === value}
      >
        {loading && <Loader2 data-icon="inline-start" className="animate-spin" />}
        Guardar
      </Button>
    </div>
  )
}
