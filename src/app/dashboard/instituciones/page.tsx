import { requireSession, isSuperadmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Building2, Plus } from 'lucide-react'

export default async function InstitucionesPage() {
  const session = await requireSession()
  if (!isSuperadmin(session)) redirect('/dashboard')

  const supabase = await createClient()
  const { data: instituciones } = await supabase
    .from('instituciones')
    .select('id, nombre, slug, tipo, activa, email, created_at')
    .is('deleted_at', null)
    .order('nombre')

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Instituciones</h1>
          <p className="text-sm text-muted-foreground">{instituciones?.length ?? 0} registradas</p>
        </div>
        <Button render={<Link href="/dashboard/instituciones/nueva" />}>
          <Plus data-icon="inline-start" />
          Nueva institución
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {instituciones?.map(inst => (
          <Card key={inst.id} className="flex flex-col">
            <CardHeader className="flex flex-row items-start gap-3 pb-2">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/15">
                <Building2 className="size-5 text-harvi-dark" />
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <CardTitle className="text-base truncate">{inst.nombre}</CardTitle>
                <p className="text-xs text-muted-foreground">{inst.slug}</p>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Badge variant={inst.activa ? 'default' : 'outline'}>
                  {inst.activa ? 'Activa' : 'Inactiva'}
                </Badge>
                {inst.tipo && <Badge variant="outline">{inst.tipo}</Badge>}
              </div>
              {inst.email && (
                <p className="text-xs text-muted-foreground truncate">{inst.email}</p>
              )}
            </CardContent>
            <CardFooter>
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                render={<Link href={`/dashboard/${inst.slug}`} />}
              >
                Ver institución
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {(!instituciones || instituciones.length === 0) && (
        <EmptyState
          icon={Building2}
          title="No hay instituciones registradas."
          action={
            <Button render={<Link href="/dashboard/instituciones/nueva" />}>
              <Plus data-icon="inline-start" />
              Crear primera institución
            </Button>
          }
        />
      )}
    </div>
  )
}
