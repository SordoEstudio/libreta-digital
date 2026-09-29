'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  añoId: string
}

export default function ActivarAñoButton({ añoId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleActivar() {
    setLoading(true)
    const res = await fetch(`/api/v1/anos-lectivos/${añoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: true }),
    })

    if (!res.ok) {
      const json = await res.json()
      toast.error(json.error?.message ?? 'Error al activar año lectivo')
      setLoading(false)
      return
    }

    toast.success('Año lectivo activado')
    setLoading(false)
    router.refresh()
  }

  return (
    <Button variant="outline" size="sm" onClick={handleActivar} disabled={loading}>
      {loading && <Loader2 data-icon="inline-start" className="animate-spin" />}
      Activar
    </Button>
  )
}
