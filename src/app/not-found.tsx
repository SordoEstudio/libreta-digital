import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 text-center px-4">
        <div className="flex size-14 items-center justify-center rounded-xl bg-muted">
          <span className="text-2xl font-black text-muted-foreground">404</span>
        </div>
        <div>
          <h1 className="text-xl font-semibold">Página no encontrada</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            La dirección que ingresaste no existe o fue eliminada.
          </p>
        </div>
        <Button variant="outline" render={<Link href="/dashboard" />}>
          Ir al inicio
        </Button>
      </div>
    </main>
  )
}
