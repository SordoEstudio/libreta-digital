'use client'

import { Button } from '@/components/ui/button'
import { Printer, Share2 } from 'lucide-react'

export default function PrintButton({ alumnoNombre }: { alumnoNombre?: string }) {
  return (
    <>
      {/* Mobile: share via Web Share API */}
      <Button
        size="icon"
        variant="ghost"
        className="md:hidden"
        onClick={async () => {
          if (navigator.share) {
            await navigator.share({
              title: alumnoNombre ? `Boletín — ${alumnoNombre}` : 'Boletín de calificaciones',
              url: window.location.href,
            }).catch(() => {})
          }
        }}
      >
        <Share2 className="size-5" />
        <span className="sr-only">Compartir</span>
      </Button>

      {/* Desktop: print */}
      <Button
        size="icon"
        variant="outline"
        className="hidden md:flex print:hidden"
        onClick={() => window.print()}
      >
        <Printer className="size-5" />
        <span className="sr-only">Imprimir / Guardar PDF</span>
      </Button>
    </>
  )
}
