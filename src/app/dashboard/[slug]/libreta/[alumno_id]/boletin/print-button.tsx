'use client'

import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'

export default function PrintButton() {
  return (
    <Button onClick={() => window.print()}>
      <Printer data-icon="inline-start" />
      Imprimir / Guardar PDF
    </Button>
  )
}
