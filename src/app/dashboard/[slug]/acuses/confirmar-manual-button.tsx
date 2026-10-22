'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  alumnoId: string
  personaId: string
  periodoId: string
  instId: string
  confirmed: boolean
}

export default function ConfirmarManualButton({ alumnoId, personaId, periodoId, instId, confirmed }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleToggle() {
    setLoading(true)
    const method = confirmed ? 'DELETE' : 'POST'
    const res = await fetch('/api/v1/boletin-acuses/admin', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alumno_id: alumnoId,
        persona_id: personaId,
        periodo_id: periodoId,
        institucion_id: instId,
      }),
    })
    setLoading(false)
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      toast.error(json.error?.message ?? 'Error')
      return
    }
    router.refresh()
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="size-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
      onClick={handleToggle}
      disabled={loading}
      title={confirmed ? 'Quitar confirmación' : 'Confirmar manualmente'}
    >
      {loading
        ? <Loader2 className="size-3 animate-spin" />
        : confirmed
          ? <XCircle className="size-3 text-muted-foreground" />
          : <CheckCircle2 className="size-3 text-emerald-500" />
      }
    </Button>
  )
}
