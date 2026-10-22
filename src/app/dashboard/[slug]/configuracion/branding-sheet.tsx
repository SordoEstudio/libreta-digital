'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ImageIcon } from 'lucide-react'
import { LogoUpload } from '@/components/logo-upload'

interface Props {
  instId: string
  logoCuadradoUrl: string | null
  logoRectangularUrl: string | null
}

// TODO (próxima etapa): expandir este sheet con más datos de la institución:
// - Nombre / razón social
// - Tipo de institución
// - Dirección
// - Teléfono / email de contacto
// - Sitio web

export function BrandingSheet({ instId, logoCuadradoUrl, logoRectangularUrl }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <ImageIcon className="size-4" />
        Identidad visual
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Identidad visual</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-8 mt-6 px-4">
            <LogoUpload
              instId={instId}
              tipo="cuadrado"
              currentUrl={logoCuadradoUrl}
              label="Isologo (cuadrado)"
              hint="PNG / SVG · mín 200×200 px · máx 2 MB"
            />
            <LogoUpload
              instId={instId}
              tipo="rectangular"
              currentUrl={logoRectangularUrl}
              label="Logotipo (rectangular)"
              hint="PNG / SVG · mín 400×100 px · máx 2 MB"
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
