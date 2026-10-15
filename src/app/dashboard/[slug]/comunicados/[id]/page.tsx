import { requireSession, isSuperadmin, hasAnyRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import Link from 'next/link'

type Params = { params: Promise<{ slug: string; id: string }> }

export default async function ComunicadoDetallePage({ params }: Params) {
  const { slug, id } = await params
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
  if (!isSuperadmin(session) && !hasAnyRole(session, inst.id, ['admin', 'docente']))
    redirect(`/dashboard/${slug}`)

  const { data: com } = await supabase
    .from('comunicados')
    .select('id, titulo, contenido, curso_id, created_at, autor_id, cursos(nombre), personas!autor_id(nombre, apellido), comunicado_confirmaciones(id, email, confirmed_at)')
    .eq('id', id)
    .eq('institucion_id', inst.id)
    .is('deleted_at', null)
    .single()

  if (!com) notFound()

  const cursoNombre = Array.isArray(com.cursos) ? com.cursos[0]?.nombre : (com.cursos as { nombre: string } | null)?.nombre
  const autorRaw = Array.isArray(com.personas) ? com.personas[0] : (com.personas as { nombre: string; apellido: string | null } | null)
  const autorNombre = autorRaw ? `${autorRaw.nombre}${autorRaw.apellido ? ` ${autorRaw.apellido}` : ''}` : '—'

  const confs = com.comunicado_confirmaciones ?? []
  const total = confs.length
  const confirmados = confs.filter(c => c.confirmed_at !== null).length

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <Link href={`/dashboard/${slug}/comunicados`} className="hover:text-foreground">Comunicados</Link>
          <span>/</span>
          <span>{com.titulo}</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-semibold">{com.titulo}</h1>
          <Badge variant={confirmados === total && total > 0 ? 'default' : 'outline'} className="mt-1 shrink-0">
            {confirmados}/{total} confirmaron
          </Badge>
        </div>
        <div className="flex gap-3 mt-2 text-sm text-muted-foreground">
          <span>{cursoNombre}</span>
          <span>·</span>
          <span>{new Date(com.created_at).toLocaleDateString('es-AR', { dateStyle: 'long' })}</span>
          <span>·</span>
          <span>{autorNombre}</span>
        </div>
      </div>

      <div className="rounded-md border p-4 bg-muted/30">
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{com.contenido}</p>
      </div>

      {confs.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Confirmado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {confs.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="text-sm">{c.email}</TableCell>
                  <TableCell>
                    {c.confirmed_at ? (
                      <span className="text-sm text-muted-foreground">
                        {new Date(c.confirmed_at).toLocaleDateString('es-AR', { dateStyle: 'medium' })}
                      </span>
                    ) : (
                      <Badge variant="outline">Pendiente</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Sin destinatarios registrados.</p>
      )}
    </div>
  )
}
