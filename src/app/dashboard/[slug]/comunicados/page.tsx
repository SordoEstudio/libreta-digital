import { requireSession, isSuperadmin, hasAnyRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import Link from 'next/link'
import { MessageSquare, CheckCircle2, Clock } from 'lucide-react'
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

  const isEditor = isSuperadmin(session) || hasAnyRole(session, inst.id, ['admin', 'docente'])
  const isOnlyResponsable = !isEditor && hasAnyRole(session, inst.id, ['responsable'])

  if (!isEditor && !isOnlyResponsable) redirect(`/dashboard/${slug}`)

  // Responsable: show their own comunicados
  if (isOnlyResponsable && session.persona_id) {
    const admin = createAdminClient()
    type ConfRaw = {
      id: string
      confirmed_at: string | null
      comunicados: {
        id: string
        titulo: string
        created_at: string
        deleted_at: string | null
        cursos: { nombre: string } | null
        materias: { materias_catalogo: { nombre: string } | null } | null
      } | null
    }
    const { data: confsRaw } = await admin
      .from('comunicado_confirmaciones')
      .select('id, confirmed_at, comunicados(id, titulo, created_at, deleted_at, cursos(nombre), materias(materias_catalogo(nombre)))')
      .eq('persona_id', session.persona_id)
      .order('created_at', { ascending: false })

    const comunicados = ((confsRaw ?? []) as ConfRaw[])
      .filter(c => c.comunicados && !c.comunicados.deleted_at)
      .map(c => ({
        confId: c.id,
        confirmed: !!c.confirmed_at,
        titulo: c.comunicados!.titulo,
        created_at: c.comunicados!.created_at,
        cursoNombre: (c.comunicados!.cursos as { nombre: string } | null)?.nombre ?? '—',
        materiaNombre: (c.comunicados!.materias as { materias_catalogo: { nombre: string } | null } | null)?.materias_catalogo?.nombre ?? null,
      }))

    const pendientes = comunicados.filter(c => !c.confirmed).length

    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold md:text-2xl">Comunicados</h1>
            <p className="text-sm text-muted-foreground">{inst.nombre}</p>
          </div>
          {pendientes > 0 && (
            <Badge variant="destructive">{pendientes} pendiente{pendientes !== 1 ? 's' : ''}</Badge>
          )}
        </div>

        {comunicados.length > 0 ? (
          <div className="flex flex-col gap-2">
            {comunicados.map(c => (
              <div key={c.confId} className="flex items-start justify-between gap-3 rounded-lg border px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-snug">{c.titulo}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {c.cursoNombre}
                    {c.materiaNombre && ` · ${c.materiaNombre}`}
                    {' · '}
                    {new Date(c.created_at).toLocaleDateString('es-AR')}
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  {c.confirmed ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                      <CheckCircle2 className="size-3.5" />
                      Confirmado
                    </span>
                  ) : (
                    <Button variant="outline" size="sm" render={<Link href={`/confirmar/${c.confId}`} />}>
                      <Clock data-icon="inline-start" />
                      Confirmar
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <MessageSquare className="size-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">No tenés comunicados.</p>
          </div>
        )}
      </div>
    )
  }

  const { data: comunicadosRaw } = await supabase
    .from('comunicados')
    .select('id, titulo, curso_id, materia_id, created_at, cursos(nombre), materias(materias_catalogo(nombre)), comunicado_confirmaciones(id, confirmed_at)')
    .eq('institucion_id', inst.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  const comunicados = (comunicadosRaw ?? []).map(c => {
    const confs = c.comunicado_confirmaciones ?? []
    const cursoNombre = Array.isArray(c.cursos) ? c.cursos[0]?.nombre : (c.cursos as { nombre: string } | null)?.nombre
    const mat = Array.isArray(c.materias) ? c.materias[0] : (c.materias as { materias_catalogo: { nombre: string } | null } | null)
    const materiaNombre = (mat?.materias_catalogo as { nombre: string } | null)?.nombre
    return {
      id: c.id,
      titulo: c.titulo,
      curso_id: c.curso_id,
      created_at: c.created_at,
      cursoNombre: cursoNombre ?? '—',
      materiaNombre: materiaNombre ?? null,
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

  const cursoIds = (cursosRaw ?? []).map(c => c.id)

  const { data: materiasRaw } = cursoIds.length > 0
    ? await supabase
        .from('materias')
        .select('id, curso_id, materias_catalogo(nombre)')
        .in('curso_id', cursoIds)
        .is('deleted_at', null)
    : { data: [] }

  type MateriaCatalogo = { nombre: string }
  type MateriaRaw = { id: string; curso_id: string; materias_catalogo: MateriaCatalogo | MateriaCatalogo[] | null }

  const materiasPorCurso = new Map<string, { id: string; nombre: string }[]>()
  for (const m of (materiasRaw ?? []) as MateriaRaw[]) {
    const cat = Array.isArray(m.materias_catalogo) ? m.materias_catalogo[0] : m.materias_catalogo
    const nombre = (cat as MateriaCatalogo | null)?.nombre ?? '—'
    const arr = materiasPorCurso.get(m.curso_id) ?? []
    arr.push({ id: m.id, nombre })
    materiasPorCurso.set(m.curso_id, arr)
  }

  const cursos = (cursosRaw ?? []).map(c => ({
    id: c.id,
    nombre: c.nombre,
    materias: materiasPorCurso.get(c.id) ?? [],
  }))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold md:text-2xl">Comunicados</h1>
          <p className="text-sm text-muted-foreground">{inst.nombre}</p>
        </div>
        <NuevoComunicadoSheet slug={slug} cursos={cursos} />
      </div>

      {comunicados.length > 0 ? (
        <>
          {/* Mobile: card list */}
          <div className="flex flex-col gap-2 md:hidden">
            {comunicados.map(c => (
              <Link
                key={c.id}
                href={`/dashboard/${slug}/comunicados/${c.id}`}
                className="block rounded-lg border p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium leading-snug">{c.titulo}</p>
                  <Badge
                    variant={c.confirmados === c.total && c.total > 0 ? 'default' : 'outline'}
                    className="shrink-0 text-xs"
                  >
                    {c.confirmados}/{c.total}
                  </Badge>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
                  <span>{c.cursoNombre}</span>
                  {c.materiaNombre && <><span>·</span><span>{c.materiaNombre}</span></>}
                  <span>·</span>
                  <span>{new Date(c.created_at).toLocaleDateString('es-AR')}</span>
                </div>
              </Link>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Curso / Materia</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Confirmaciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comunicados.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      <Link href={`/dashboard/${slug}/comunicados/${c.id}`} className="hover:underline">
                        {c.titulo}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.cursoNombre}
                      {c.materiaNombre && (
                        <span className="text-muted-foreground/70"> · {c.materiaNombre}</span>
                      )}
                    </TableCell>
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
        </>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <MessageSquare className="size-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">Aún no hay comunicados.</p>
        </div>
      )}
    </div>
  )
}
