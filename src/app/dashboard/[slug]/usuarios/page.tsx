import { requireSession, isSuperadmin, hasRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Users } from 'lucide-react'
import NuevoUsuarioSheet from './nuevo-usuario-sheet'
import DesactivarUsuarioButton from './desactivar-usuario-button'

type Params = { params: Promise<{ slug: string }> }

const ROL_LABELS: Record<string, string> = {
  admin: 'Admin',
  docente: 'Docente',
  responsable: 'Responsable',
  superadmin: 'Superadmin',
}

const ROL_VARIANTS: Record<string, 'default' | 'secondary' | 'outline'> = {
  admin: 'default',
  docente: 'secondary',
  responsable: 'outline',
  superadmin: 'default',
}

export default async function UsuariosPage({ params }: Params) {
  const { slug } = await params
  const session = await requireSession()

  const supabase = await createClient()
  const { data: inst } = await supabase
    .from('instituciones')
    .select('id, nombre')
    .eq('slug', slug)
    .is('deleted_at', null)
    .single()

  if (!inst) notFound()
  if (!isSuperadmin(session) && !hasRole(session, inst.id, 'admin')) redirect('/dashboard')

  const admin = createAdminClient()
  const { data: memberships } = await admin
    .from('memberships')
    .select('rol, activo, personas(id, nombre, email)')
    .eq('institucion_id', inst.id)
    .order('rol')

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Usuarios</h1>
          <p className="text-sm text-muted-foreground">{memberships?.filter(m => m.activo).length ?? 0} miembros activos</p>
        </div>
        <NuevoUsuarioSheet instId={inst.id} />
      </div>

      {memberships && memberships.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {memberships.map((m, i) => {
                const persona = m.personas as { id: string; nombre: string; email: string | null } | null
                return (
                  <TableRow key={i} className={!m.activo ? 'opacity-60' : ''}>
                    <TableCell className="font-medium">{persona?.nombre ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{persona?.email ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={ROL_VARIANTS[m.rol] ?? 'outline'}>
                        {ROL_LABELS[m.rol] ?? m.rol}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={m.activo ? 'default' : 'secondary'}>
                        {m.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {persona && m.rol !== 'superadmin' && (
                        <DesactivarUsuarioButton
                          instId={inst.id}
                          personaId={persona.id}
                          nombre={persona.nombre}
                          activo={m.activo}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <Users className="size-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">Sin usuarios registrados.</p>
        </div>
      )}
    </div>
  )
}
