'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { toast } from 'sonner'
import { useInstitucionConfig } from '@/lib/institucion-config'

interface Props {
  evaluacionId: string
  recuperatorioId: string | null
  slug: string
}

export default function GenerarRecuperatorioButton({ evaluacionId, recuperatorioId, slug }: Props) {
  const { terminoRecuperatorio } = useInstitucionConfig()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  if (recuperatorioId) {
    return (
      <Button variant="outline" size="sm" render={<Link href={`/dashboard/${slug}/notas/${recuperatorioId}`} />}>
        Ver {terminoRecuperatorio.toLowerCase()}
      </Button>
    )
  }

  async function handleGenerar() {
    setLoading(true)
    const res = await fetch(`/api/v1/evaluaciones/${evaluacionId}/recuperatorio`, { method: 'POST' })
    const json = await res.json()
    setLoading(false)
    if (res.ok) {
      toast.success(`${terminoRecuperatorio} generado`)
      router.refresh()
    } else {
      toast.error(json.error?.message ?? `Error al generar ${terminoRecuperatorio.toLowerCase()}`)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleGenerar} disabled={loading}>
      {loading ? 'Generando...' : `Generar ${terminoRecuperatorio.toLowerCase()}`}
    </Button>
  )
}
