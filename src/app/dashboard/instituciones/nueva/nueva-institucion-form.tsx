'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

const TIPOS = [
  { value: 'academia', label: 'Academia' },
  { value: 'instituto', label: 'Instituto' },
  { value: 'club', label: 'Club' },
  { value: 'otro', label: 'Otro' },
]

function toSlug(nombre: string) {
  return nombre.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim().replace(/\s+/g, '-')
}

export default function NuevaInstitucionForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nombre, setNombre] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [tipo, setTipo] = useState('')
  const [email, setEmail] = useState('')

  function handleNombreChange(value: string) {
    setNombre(value)
    if (!slugTouched) setSlug(toSlug(value))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const body: Record<string, string> = { nombre, slug }
    if (tipo) body.tipo = tipo
    if (email) body.email = email

    const res = await fetch('/api/v1/instituciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const json = await res.json()

    if (!res.ok) {
      setError(json.error?.message ?? 'Error al crear la institución')
      setLoading(false)
      return
    }

    toast.success(`Institución "${nombre}" creada`)
    router.push('/dashboard/instituciones')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="nombre">Nombre *</Label>
        <Input
          id="nombre"
          value={nombre}
          onChange={e => handleNombreChange(e.target.value)}
          placeholder="Ej: Instituto San Martín"
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="slug">Slug (URL) *</Label>
        <Input
          id="slug"
          value={slug}
          onChange={e => { setSlug(e.target.value); setSlugTouched(true) }}
          placeholder="ej: instituto-san-martin"
          pattern="[a-z0-9-]+"
          required
        />
        <p className="text-xs text-muted-foreground">Solo minúsculas, números y guiones.</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tipo">Tipo</Label>
        <Select value={tipo} onValueChange={v => setTipo(v ?? '')}>
          <SelectTrigger id="tipo">
            <SelectValue placeholder="Seleccionar tipo..." />
          </SelectTrigger>
          <SelectContent>
            {TIPOS.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email de contacto</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="contacto@institucion.edu.ar"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading || !nombre || !slug}>
          {loading && <Loader2 data-icon="inline-start" className="animate-spin" />}
          {loading ? 'Creando...' : 'Crear institución'}
        </Button>
      </div>
    </form>
  )
}
