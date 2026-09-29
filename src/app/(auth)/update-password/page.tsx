'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Loader2 } from 'lucide-react'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError('No se pudo actualizar la contraseña. El link puede haber expirado.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm flex flex-col gap-6 p-8">
        <div className="flex flex-col gap-1 text-center">
          <h1 className="text-2xl font-semibold">Crear contraseña</h1>
          <p className="text-sm text-muted-foreground">
            Ingresá tu nueva contraseña para acceder.
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Nueva contraseña</Label>
            <Input
              id="password"
              type="password"
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              minLength={8}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm">Confirmar contraseña</Label>
            <Input
              id="confirm"
              type="password"
              placeholder="Repetí la contraseña"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading && <Loader2 data-icon="inline-start" className="animate-spin" />}
            {loading ? 'Guardando...' : 'Guardar contraseña'}
          </Button>
        </form>
      </div>
    </div>
  )
}
