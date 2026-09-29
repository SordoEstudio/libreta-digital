import { requireSession, isSuperadmin, hasRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar } from 'lucide-react'
import Link from 'next/link'

type Params = { params: Promise<{ slug: string }> }

export default async function ConfiguracionPage({ params }: Params) {
  const { slug } = await params
  const session = await requireSession()

  const supabase = await createClient()
  const { data: inst } = await supabase
    .from('instituciones')
    .select('id')
    .eq('slug', slug)
    .is('deleted_at', null)
    .single()

  if (!inst) notFound()
  if (!isSuperadmin(session) && !hasRole(session, inst.id, 'admin')) redirect(`/dashboard/${slug}`)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Configuración</h1>
        <p className="text-sm text-muted-foreground">Configuración de la institución</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="size-5 text-muted-foreground" />
              <CardTitle className="text-base">Períodos</CardTitle>
            </div>
            <CardDescription>
              Creá y gestioná los años lectivos y sus períodos.
            </CardDescription>
          </CardHeader>
          <div className="px-6 pb-6">
            <Button
              variant="outline"
              size="sm"
              render={<Link href={`/dashboard/${slug}/configuracion/periodos`} />}
            >
              Gestionar
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
