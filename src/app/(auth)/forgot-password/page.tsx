'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin).replace(/\/$/, '')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/update-password`,
    })

    if (error) {
      setError('No se pudo enviar el email. Verificá la dirección ingresada.')
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm flex flex-col gap-6 p-8">
        <div className="flex flex-col gap-1 text-center">
          <h1 className="text-2xl font-semibold">Recuperar contraseña</h1>
          <p className="text-sm text-muted-foreground">
            Ingresá tu email y te enviamos un link.
          </p>
        </div>

        {sent ? (
          <Alert>
            <CheckCircle2 className="size-4" />
            <AlertDescription>
              Revisá tu bandeja de entrada. Si el email existe, recibirás un link para
              crear tu contraseña.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nombre@ejemplo.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading && <Loader2 data-icon="inline-start" className="animate-spin" />}
                {loading ? 'Enviando...' : 'Enviar link'}
              </Button>
            </form>
          </>
        )}

        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="underline underline-offset-4 hover:text-foreground">
            Volver al inicio de sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
