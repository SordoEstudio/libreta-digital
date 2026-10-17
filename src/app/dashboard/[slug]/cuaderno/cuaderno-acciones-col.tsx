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
import EditarEvalRefSheet from '@/components/eval-ref/editar-eval-ref-sheet'

interface EvalRefMeta {
  id: string
  nombre: string
  tipo: 'numerica' | 'conceptual'
  periodoId: string | null
  dimensionIds: string[]
}

interface Periodo { id: string; nombre: string; orden: number }
interface Dimension { id: string; nombre: string; orden: number }

interface Props {
  evalRef: EvalRefMeta
  periodos: Periodo[]
  dimensiones: Dimension[]
}

export default function CuadernoAccionesCol({ evalRef, periodos, dimensiones }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleEliminar() {
    setLoading(true)
    const res = await fetch(`/api/v1/evaluaciones-referencia/${evalRef.id}`, { method: 'DELETE' })

    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      toast.error(json.error?.message ?? 'Error al eliminar evaluación')
      setLoading(false)
      return
    }

    toast.success(`"${evalRef.nombre}" eliminada`)
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="flex items-center justify-center gap-0.5">
      <EditarEvalRefSheet
        evalRefId={evalRef.id}
        initialNombre={evalRef.nombre}
        initialTipo={evalRef.tipo}
        initialFecha={null}
        initialPeriodoId={evalRef.periodoId}
        initialDimensionIds={evalRef.dimensionIds}
        periodos={periodos}
        dimensiones={dimensiones}
      />
      <AlertDialog>
        <AlertDialogTrigger render={<Button variant="ghost" size="icon" className="size-7 text-destructive/60 hover:text-destructive" />}>
          <Trash2 className="size-3.5" />
          <span className="sr-only">Eliminar {evalRef.nombre}</span>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar "{evalRef.nombre}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán también las notas cargadas para esta evaluación. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleEliminar} disabled={loading} variant="destructive">
              {loading && <Loader2 data-icon="inline-start" className="animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
