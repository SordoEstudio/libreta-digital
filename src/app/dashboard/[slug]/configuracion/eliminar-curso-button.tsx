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
  cursoId: string
  cursoNombre: string
  slug: string
  añoId: string
}

export default function EliminarCursoButton({ cursoId, cursoNombre, slug, añoId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleEliminar() {
    setLoading(true)
    const res = await fetch(`/api/v1/cursos/${cursoId}`, { method: 'DELETE' })

    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      toast.error(json.error?.message ?? 'Error al eliminar curso')
      setLoading(false)
      return
    }

    toast.success(`Curso "${cursoNombre}" eliminado`)
    setLoading(false)
    router.push(`/dashboard/${slug}/configuracion?año=${añoId}`)
    router.refresh()
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="ghost" size="icon" className="size-6 text-destructive/60 hover:text-destructive" />}>
        <Trash2 className="size-3" />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar "{cursoNombre}"?</AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminarán también sus materias (si no tienen notas). Los alumnos activos deben ser reasignados primero.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleEliminar}
            disabled={loading}
            variant="destructive"
          >
            {loading && <Loader2 data-icon="inline-start" className="animate-spin" />}
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
