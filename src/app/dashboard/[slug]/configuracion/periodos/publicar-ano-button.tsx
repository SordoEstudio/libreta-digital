'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Loader2, Globe } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  instId: string
  añoId: string
  añoNombre: string
}

export default function PublicarAñoButton({ instId, añoId, añoNombre }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handlePublicar() {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/instituciones/${instId}/anos-lectivos/${añoId}/publicar`, {
        method: 'POST',
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error?.message ?? 'Error al publicar año')
        return
      }
      toast.success(`Boletín anual de ${añoNombre} publicado`)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="outline" size="sm" disabled={loading} />}>
        {loading ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <Globe data-icon="inline-start" />}
        Publicar boletín anual
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Publicar boletín anual — {añoNombre}</AlertDialogTitle>
          <AlertDialogDescription>
            Los responsables podrán ver las evaluaciones anuales (definitiva anual, concepto) en la libreta digital.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handlePublicar}>Publicar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
