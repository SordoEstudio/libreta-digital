'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[DashboardError]', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-destructive/10">
        <span className="text-xl">⚠</span>
      </div>
      <div>
        <h2 className="font-semibold">Algo salió mal</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          No se pudo cargar esta sección.
        </p>
        {error.digest && (
          <p className="mt-1 text-xs text-muted-foreground/60 font-mono">{error.digest}</p>
        )}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={reset}>Reintentar</Button>
        <Button variant="ghost" render={<Link href="/dashboard" />}>Inicio</Button>
      </div>
    </div>
  )
}
