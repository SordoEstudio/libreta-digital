import { requireSession, isSuperadmin, hasRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'

type PageProps = { params: Promise<{ slug: string }> }

const ACCION_LABELS: Record<string, string> = {
  crear_usuario: 'Creó usuario',
  editar_usuario: 'Editó usuario',
  cambiar_rol: 'Cambió rol',
  activar_usuario: 'Activó usuario',
  desactivar_usuario: 'Desactivó usuario',
  invitar_usuario: 'Reenvió invitación',
  confirmar_boletin: 'Confirmó lectura boletín',
  quitar_confirmacion_boletin: 'Quitó confirmación boletín',
}

function metadataResumen(accion: string, metadata: Record<string, unknown> | null): string {
  if (!metadata) return ''
  if (accion === 'crear_usuario' || accion === 'editar_usuario') {
    const parts: string[] = []
    if (metadata.nombre) parts.push(String(metadata.nombre))
    if (metadata.email) parts.push(String(metadata.email))
    if (metadata.rol) parts.push(`(${metadata.rol})`)
    return parts.join(' ')
  }
  if (accion === 'cambiar_rol') {
    return metadata.rol_nuevo ? `→ ${metadata.rol_nuevo}` : ''
  }
  return ''
}

export default async function ActividadPage({ params }: PageProps) {
  const { slug } = await params
  const session = await requireSession()

  const supabase = await createClient()
  const { data: inst } = await supabase
    .from('instituciones')
    .select('id, nombre')
    .eq('slug', slug)
    .is('deleted_at', null)
    .single()

  if (!inst) {
    if (isSuperadmin(session)) redirect('/dashboard/instituciones')
    notFound()
  }
  if (!isSuperadmin(session) && !hasRole(session, inst.id, 'admin'))
    redirect(`/dashboard/${slug}`)

  const admin = createAdminClient()

  const { data: logs } = await admin
    .from('actividad_log')
    .select('id, accion, entidad, entidad_id, metadata, created_at, personas(nombre, apellido)')
    .eq('institucion_id', inst.id)
    .order('created_at', { ascending: false })
    .limit(300)

  type LogRow = {
    id: string
    accion: string
    entidad: string | null
    entidad_id: string | null
    metadata: Record<string, unknown> | null
    created_at: string
    personas: { nombre: string; apellido: string | null } | null
  }

  const rows = (logs ?? []) as LogRow[]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold md:text-2xl">Registro de actividad</h1>
        <p className="text-sm text-muted-foreground">Últimas {rows.length} acciones registradas</p>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Fecha</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide hidden sm:table-cell">Quién</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Acción</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide hidden md:table-cell">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const persona = row.personas
              const nombrePersona = persona
                ? persona.apellido ? `${persona.apellido}, ${persona.nombre}` : persona.nombre
                : '—'
              const label = ACCION_LABELS[row.accion] ?? row.accion
              const detalle = metadataResumen(row.accion, row.metadata)
              const fecha = new Date(row.created_at)
              return (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                    <span title={fecha.toLocaleString('es-AR')}>
                      {fecha.toLocaleDateString('es-AR')}
                    </span>
                    <span className="block text-xs text-muted-foreground/60">
                      {fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 hidden sm:table-cell">{nombrePersona}</td>
                  <td className="px-4 py-2.5 font-medium">{label}</td>
                  <td className="px-4 py-2.5 text-muted-foreground hidden md:table-cell">{detalle}</td>
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Sin actividad registrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
