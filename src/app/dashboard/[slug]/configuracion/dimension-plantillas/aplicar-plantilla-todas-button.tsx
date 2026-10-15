'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Loader2, Layers } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  plantillaId: string
  plantillaNombre: string
}

export default function AplicarPlantillaTodas({ plantillaId, plantillaNombre }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleAplicar() {
    setLoading(true)
    const res = await fetch(`/api/v1/dimension-plantillas/${plantillaId}/aplicar-todas`, {
      method: 'POST',
    })
    const json = await res.json().catch(() => ({}))
    setLoading(false)
    if (res.ok) {
      toast.success(`Plantilla aplicada a ${json.data?.materias_actualizadas ?? 0} materia(s)`)
      router.refresh()
    } else {
      toast.error(json.error?.message ?? 'Error al aplicar plantilla')
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            disabled={loading}
            className="text-muted-foreground hover:text-foreground"
          />
        }
      >
        {loading
          ? <Loader2 data-icon="inline-start" className="animate-spin" />
          : <Layers data-icon="inline-start" />}
        Aplicar a todas las materias
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Aplicar &quot;{plantillaNombre}&quot; a toda la institución</AlertDialogTitle>
          <AlertDialogDescription>
            Las dimensiones de todas las materias de todos los cursos serán reemplazadas por las de esta plantilla. Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleAplicar}>
            Confirmar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
