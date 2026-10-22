'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
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
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
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
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="size-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => setOpen(true)}
        title={confirmed ? 'Quitar confirmación' : 'Confirmar manualmente'}
      >
        {confirmed
          ? <XCircle className="size-3 text-muted-foreground" />
          : <CheckCircle2 className="size-3 text-emerald-500" />
        }
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={confirmed ? '¿Quitar confirmación?' : '¿Confirmar lectura?'}
        description={confirmed
          ? 'Se eliminará la confirmación manual de lectura del boletín.'
          : 'Se registrará tu usuario como confirmador manual de lectura del boletín.'
        }
        confirmLabel={confirmed ? 'Quitar' : 'Confirmar'}
        destructive={confirmed}
        loading={loading}
        onConfirm={handleConfirm}
      />
    </>
  )
}
