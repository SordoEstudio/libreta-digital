'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Loader2, Layers } from 'lucide-react'
import { toast } from 'sonner'

interface Plantilla {
  id: string
  nombre: string
}

interface Props {
  cursoId: string
  instId: string
}

export default function AplicarPlantillaCursoButton({ cursoId, instId }: Props) {
  const router = useRouter()
  const [plantillas, setPlantillas] = useState<Plantilla[]>([])
  const [plantillaId, setPlantillaId] = useState('')
  const [applying, setApplying] = useState(false)

  useEffect(() => {
    fetch(`/api/v1/instituciones/${instId}/dimension-plantillas`)
      .then(r => r.ok ? r.json() : null)
      .then(json => { if (json?.data) setPlantillas(json.data as Plantilla[]) })
  }, [instId])

  if (plantillas.length === 0) return null

  async function handleApply() {
    if (!plantillaId) return
    setApplying(true)
    const res = await fetch(`/api/v1/cursos/${cursoId}/dimensiones/aplicar-plantilla`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plantilla_id: plantillaId }),
    })
    const json = await res.json()
    setApplying(false)
    if (res.ok) {
      toast.success(`Plantilla aplicada a ${json.data?.materias_actualizadas ?? 0} materia(s)`)
      setPlantillaId('')
      router.refresh()
    } else {
      toast.error(json.error?.message ?? 'Error al aplicar plantilla')
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="outline" size="sm" disabled={applying} />}>
        {applying
          ? <Loader2 className="size-4 animate-spin" />
          : <Layers className="size-4" />}
        Aplicar plantilla al curso
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Aplicar plantilla a todo el curso</AlertDialogTitle>
          <AlertDialogDescription>
            Las dimensiones de todas las materias del curso serán reemplazadas. Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="px-6 pb-2">
          <select
            value={plantillaId}
            onChange={e => setPlantillaId(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          >
            <option value="">Seleccioná una plantilla</option>
            {plantillas.map(p => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleApply} disabled={!plantillaId || applying}>
            {applying && <Loader2 data-icon="inline-start" className="animate-spin" />}
            Confirmar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
