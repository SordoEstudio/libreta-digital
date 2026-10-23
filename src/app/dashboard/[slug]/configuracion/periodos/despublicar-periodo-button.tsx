'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Loader2, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  instId: string
  periodoId: string
  periodoNombre: string
}

export default function DespublicarPeriodoButton({ instId, periodoId, periodoNombre }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDespublicar() {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/instituciones/${instId}/periodos/${periodoId}/despublicar`, {
        method: 'POST',
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error?.message ?? 'Error al despublicar período')
        return
      }
      toast.success(`${periodoNombre} despublicado`)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="ghost" size="sm" disabled={loading} />}>
        {loading ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <EyeOff data-icon="inline-start" />}
        Despublicar
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Despublicar {periodoNombre}</AlertDialogTitle>
          <AlertDialogDescription>
            Los responsables dejarán de ver las notas de este período hasta que vuelvas a publicar.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleDespublicar}>Despublicar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
