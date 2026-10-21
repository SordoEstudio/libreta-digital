'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

interface Props {
  alumnoId: string
  periodoIds: string[]
  slug: string
}

export default function ConfirmarButton({ alumnoId, periodoIds, slug }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirmar() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/v1/boletin-acuses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alumno_id: alumnoId, periodo_ids: periodoIds }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error?.message ?? 'Error al confirmar')
      }
      router.replace(`/dashboard/${slug}/libreta/${alumnoId}/boletin`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al confirmar')
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={handleConfirmar} disabled={loading} className="w-full">
        {loading ? 'Confirmando...' : 'Confirmar y ver boletín'}
        <ArrowRight data-icon="inline-end" />
      </Button>
      {error && <p className="text-sm text-destructive text-center">{error}</p>}
    </div>
  )
}
