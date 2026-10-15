import { requireSession, isSuperadmin, hasAnyRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import Link from 'next/link'
import { MessageSquare } from 'lucide-react'
import NuevoComunicadoSheet from './nuevo-comunicado-sheet'

type Params = { params: Promise<{ slug: string }> }

export default async function ComunicadosPage({ params }: Params) {
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
  if (!isSuperadmin(session) && !hasAnyRole(session, inst.id, ['admin', 'docente']))
    redirect(`/dashboard/${slug}`)

  const { data: comunicadosRaw } = await supabase
    .from('comunicados')
    .select('id, titulo, curso_id, created_at, cursos(nombre), comunicado_confirmaciones(id, confirmed_at)')
    .eq('institucion_id', inst.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  const comunicados = (comunicadosRaw ?? []).map(c => {
    const confs = c.comunicado_confirmaciones ?? []
    const cursoNombre = Array.isArray(c.cursos) ? c.cursos[0]?.nombre : (c.cursos as { nombre: string } | null)?.nombre
    return {
      id: c.id,
      titulo: c.titulo,
      curso_id: c.curso_id,
      created_at: c.created_at,
      cursoNombre: cursoNombre ?? '—',
      total: confs.length,
      confirmados: confs.filter(cf => cf.confirmed_at !== null).length,
    }
  })

  const { data: cursosRaw } = await supabase
    .from('cursos')
    .select('id, nombre')
    .eq('institucion_id', inst.id)
    .is('deleted_at', null)
    .order('nombre')

  const cursos = (cursosRaw ?? []).map(c => ({ id: c.id, nombre: c.nombre }))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Comunicados</h1>
          <p className="text-sm text-muted-foreground">{inst.nombre}</p>
        </div>
        <NuevoComunicadoSheet slug={slug} cursos={cursos} />
      </div>

      {comunicados.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Curso</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Confirmaciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comunicados.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/dashboard/${slug}/comunicados/${c.id}`}
                      className="hover:underline"
                    >
                      {c.titulo}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.cursoNombre}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString('es-AR')}
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.confirmados === c.total && c.total > 0 ? 'default' : 'outline'}>
                      {c.confirmados}/{c.total}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <MessageSquare className="size-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">Aún no hay comunicados.</p>
        </div>
      )}
    </div>
  )
}
