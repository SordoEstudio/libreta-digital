'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Loader2, Eye } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  instId: string
  periodoId: string
  periodoNombre: string
}

export default function PublicarPeriodoButton({ instId, periodoId, periodoNombre }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handlePublicar() {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/instituciones/${instId}/periodos/${periodoId}/publicar`, {
        method: 'POST',
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error?.message ?? 'Error al publicar período')
        return
      }
      toast.success(`${periodoNombre} publicado — responsables ya pueden ver las notas`)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="outline" size="sm" disabled={loading} />}>
        {loading ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <Eye data-icon="inline-start" />}
        Publicar
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Publicar {periodoNombre}</AlertDialogTitle>
          <AlertDialogDescription>
            Los responsables podrán ver las notas de este período en la libreta digital.
            Podés despublicar si necesitás corregir algo.
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
