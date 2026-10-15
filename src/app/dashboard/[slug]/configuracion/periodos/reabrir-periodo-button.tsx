'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  instId: string
  periodoId: string
  periodoNombre: string
}

export default function ReabrirPeriodoButton({ instId, periodoId, periodoNombre }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleReabrir() {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/instituciones/${instId}/periodos/${periodoId}/reabrir`, {
        method: 'POST',
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error?.message ?? 'Error al reabrir período')
        return
      }
      toast.success(`Período ${periodoNombre} reabierto`)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="outline" size="sm" disabled={loading} />}>
        {loading && <Loader2 data-icon="inline-start" className="animate-spin" />}
        Reabrir
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Reabrir {periodoNombre}?</AlertDialogTitle>
          <AlertDialogDescription>
            El período volverá a estar abierto y se podrán editar notas, evaluaciones y asistencia.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleReabrir}>Reabrir</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
