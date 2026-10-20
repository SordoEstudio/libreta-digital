import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background gap-10 px-4">
      <div className="flex items-center gap-2.5">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-harvi-green-lime">
          <span className="text-[12px] font-black text-harvi-dark leading-none">LD</span>
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold leading-tight">Libreta.digital</span>
          <span className="text-[10px] text-muted-foreground leading-tight">by Harvi</span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 text-center">
        <span className="text-7xl font-black text-muted-foreground/20 leading-none">404</span>
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
