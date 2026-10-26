'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  alumnoId:      string
  periodoId:     string
  periodoNombre: string
  initialTexto:  string
  canEdit:       boolean
}

export default function ObservacionEditor({ alumnoId, periodoId, initialTexto, canEdit }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [texto, setTexto] = useState(initialTexto)
  const [saving, setSaving] = useState(false)

  if (!canEdit && !initialTexto) return null

  async function save(value: string) {
    setSaving(true)
    const res = await fetch('/api/v1/observaciones-boletin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alumno_id: alumnoId, periodo_id: periodoId, texto: value }),
    })
    setSaving(false)
    if (res.ok) {
      toast.success(value.trim() ? 'Observación guardada' : 'Observación eliminada')
      router.refresh()
      setEditing(false)
    } else {
      const j = await res.json()
      toast.error(j.error?.message ?? 'Error al guardar')
    }
  }

  if (!canEdit) {
    return (
      <p className="text-sm text-foreground whitespace-pre-wrap">{initialTexto}</p>
    )
  }

  if (!editing) {
    return (
      <div className="flex items-start gap-3">
        {initialTexto ? (
          <>
            <p className="text-sm flex-1 whitespace-pre-wrap">{initialTexto}</p>
            <Button variant="ghost" size="sm" onClick={() => { setTexto(initialTexto); setEditing(true) }} className="shrink-0">
              Editar
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground italic flex-1">Sin observación</p>
            <Button variant="ghost" size="sm" onClick={() => { setTexto(''); setEditing(true) }} className="shrink-0">
              Agregar
            </Button>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
        rows={4}
        maxLength={1000}
        value={texto}
        onChange={e => setTexto(e.target.value)}
        autoFocus
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{texto.length}/1000</span>
        <div className="flex gap-2">
          {initialTexto && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => save('')}
              disabled={saving}
              className="text-destructive hover:text-destructive"
            >
              {saving && <Loader2 data-icon="inline-start" className="animate-spin" />}
              Eliminar
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button size="sm" onClick={() => save(texto)} disabled={saving || !texto.trim()}>
            {saving && <Loader2 data-icon="inline-start" className="animate-spin" />}
            Guardar
          </Button>
        </div>
      </div>
    </div>
  )
}
