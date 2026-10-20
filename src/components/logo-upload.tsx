'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  instId: string
  tipo: 'cuadrado' | 'rectangular'
  currentUrl?: string | null
  label: string
  hint: string
  onUpdate?: (url: string | null) => void
}

export function LogoUpload({ instId, tipo, currentUrl, label, hint, onUpdate }: Props) {
  const [url, setUrl] = useState<string | null>(currentUrl ?? null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setLoading(true)
    const form = new FormData()
    form.set('tipo', tipo)
    form.set('file', file)

    const res = await fetch(`/api/v1/instituciones/${instId}/logo`, { method: 'POST', body: form })
    const json = await res.json()
    setLoading(false)

    if (!res.ok) {
      toast.error(json.error?.message ?? 'Error al subir logo')
      return
    }

    setUrl(json.data.url)
    onUpdate?.(json.data.url)
    toast.success(`${label} actualizado`)
  }

  async function handleRemove() {
    setLoading(true)
    const res = await fetch(`/api/v1/instituciones/${instId}/logo?tipo=${tipo}`, { method: 'DELETE' })
    setLoading(false)

    if (!res.ok) {
      const json = await res.json()
      toast.error(json.error?.message ?? 'Error al eliminar logo')
      return
    }

    setUrl(null)
    onUpdate?.(null)
    toast.success(`${label} eliminado`)
  }

  const aspectClass = tipo === 'cuadrado'
    ? 'aspect-square w-28'
    : 'aspect-[3/1] w-52'

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>

      <div
        className={`${aspectClass} relative flex items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 overflow-hidden cursor-pointer hover:bg-muted/50 transition-colors`}
        onClick={() => !loading && inputRef.current?.click()}
      >
        {loading ? (
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        ) : url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={label} className="size-full object-contain p-2" />
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
            <Upload className="size-5" />
            <span className="text-xs">Subir</span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="size-3.5" />
          {url ? 'Cambiar' : 'Subir'}
        </Button>
        {url && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={loading}
            onClick={handleRemove}
          >
            <X className="size-3.5" />
            Quitar
          </Button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="sr-only"
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
          e.target.value = ''
        }}
      />
    </div>
  )
}
