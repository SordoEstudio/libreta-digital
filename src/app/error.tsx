'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 text-center px-4">
        <div className="flex size-14 items-center justify-center rounded-xl bg-destructive/10">
          <span className="text-2xl">⚠</span>
        </div>
        <div>
          <h1 className="text-xl font-semibold">Algo salió mal</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ocurrió un error inesperado. Podés intentar de nuevo.
          </p>
          {error.digest && (
            <p className="mt-1 text-xs text-muted-foreground/60 font-mono">
              {error.digest}
            </p>
          )}
        </div>
        <Button onClick={reset}>Intentar de nuevo</Button>
      </div>
    </main>
  )
}
