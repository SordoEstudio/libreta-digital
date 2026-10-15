'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Loader2, Mail } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  instId: string
  periodoId: string
  periodoNombre: string
}

export default function NotificarPeriodoDialog({ instId, periodoId, periodoNombre }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleNotificar() {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/instituciones/${instId}/periodos/${periodoId}/notificar`, {
        method: 'POST',
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error?.message ?? 'Error al enviar notificaciones')
        return
      }
      toast.success(`${json.data.enviados} emails enviados`)
      if (json.data.errores > 0) {
        toast.error(`${json.data.errores} errores al enviar`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="outline" size="sm" disabled={loading} />}>
        {loading ? (
          <Loader2 data-icon="inline-start" className="animate-spin" />
        ) : (
          <Mail data-icon="inline-start" />
        )}
        Enviar libretas
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Enviar libretas — {periodoNombre}</AlertDialogTitle>
          <AlertDialogDescription>
            Se enviará un email a los responsables de los alumnos con link a la libreta digital.
            Podés enviar múltiples veces.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleNotificar}>Enviar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
