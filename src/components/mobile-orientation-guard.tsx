'use client'

import { useState, useEffect } from 'react'
import { useIsMobile } from '@/hooks/use-mobile'
import { RotateCw, Monitor } from 'lucide-react'

export function MobileOrientationGuard({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile()
  const [isPortrait, setIsPortrait] = useState(false)

  useEffect(() => {
    const check = () => setIsPortrait(window.innerHeight > window.innerWidth)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const showOverlay = isMobile && isPortrait

  return (
    <div className="relative">
      <div className={showOverlay ? 'blur-sm pointer-events-none select-none' : ''}>
        {children}
      </div>
      {showOverlay && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm rounded-lg min-h-32">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted">
            <RotateCw className="size-7 text-muted-foreground" />
          </div>
          <div className="text-center px-6">
            <p className="text-sm font-semibold">Girá el dispositivo</p>
            <p className="mt-1 text-xs text-muted-foreground">
              o abrí en una PC para mejor experiencia
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground/50">
            <Monitor className="size-3.5" />
            <span>libreta.digital</span>
          </div>
        </div>
      )}
    </div>
  )
}
