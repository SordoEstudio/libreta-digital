'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Loader2, Lock } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  instId: string
  añoId: string
  añoNombre: string
}

export default function CerrarAñoButton({ instId, añoId, añoNombre }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleCerrar() {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/instituciones/${instId}/anos-lectivos/${añoId}/cerrar`, {
        method: 'POST',
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error?.message ?? 'Error al cerrar año')
        return
      }
      toast.success(`Año ${añoNombre} cerrado`)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="outline" size="sm" disabled={loading} />}>
        {loading ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <Lock data-icon="inline-start" />}
        Cerrar año
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cerrar año {añoNombre}</AlertDialogTitle>
          <AlertDialogDescription>
            Bloquea la edición de evaluaciones anuales. No afecta las notas de los períodos.
            Podés publicar el boletín anual una vez cerrado.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleCerrar}>Cerrar año</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
