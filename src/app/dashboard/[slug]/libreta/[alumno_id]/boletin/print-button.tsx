'use client'

import { Button } from '@/components/ui/button'
import { Printer, Share2, Download } from 'lucide-react'

export default function PrintButton({ alumnoNombre }: { alumnoNombre?: string }) {
  return (
    <>
      {/* Mobile: share + save PDF */}
      <div className="flex gap-1.5 md:hidden print:hidden">
        <Button
          size="sm"
          variant="ghost"
          onClick={async () => {
            if (navigator.share) {
              await navigator.share({
                title: alumnoNombre ? `Boletín — ${alumnoNombre}` : 'Boletín de calificaciones',
                url: window.location.href,
              }).catch(() => {})
            }
          }}
        >
          <Share2 className="size-4" />
          Compartir
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => window.print()}
        >
          <Download className="size-4" />
          Guardar
        </Button>
      </div>

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
