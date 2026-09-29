'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  añoId: string
  añoNombre: string
}

export default function EliminarAñoButton({ añoId, añoNombre }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleEliminar() {
    setLoading(true)
    const res = await fetch(`/api/v1/anos-lectivos/${añoId}`, { method: 'DELETE' })
    const json = await res.json()

    if (!res.ok) {
      toast.error(json.error?.message ?? 'Error al eliminar año lectivo')
      setLoading(false)
      return
    }

    toast.success(`Año lectivo "${añoNombre}" eliminado`)
    setLoading(false)
    router.refresh()
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" />}>
        <Trash2 className="size-4" />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar "{añoNombre}"?</AlertDialogTitle>
          <AlertDialogDescription>
            Solo se puede eliminar si no tiene cursos asociados. Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleEliminar}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading && <Loader2 data-icon="inline-start" className="animate-spin" />}
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
