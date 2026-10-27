'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { isCerradoParaCurso, isPublicadoParaCurso } from '@/lib/cierre-periodo'
import { Loader2 } from 'lucide-react'

interface Props {
  instId: string
  periodoId: string
  cursos: Array<{
    id: string
    nombre: string
    override: {
      cerrado_at: string | null
      publicado_at: string | null
      abierto_at: string | null
    } | null
  }>
  periodoCerradoAt: string | null
  periodoPublicadoAt: string | null
}

type Action = 'cerrar' | 'publicar' | 'reabrir' | 'despublicar'

const ACTION_LABEL: Record<Action, string> = {
  cerrar: 'Cerrado',
  publicar: 'Publicado',
  reabrir: 'Reabierto',
  despublicar: 'Despublicado',
}

export default function CierreGranularTable({
  instId,
  periodoId,
  cursos,
  periodoCerradoAt,
  periodoPublicadoAt,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function doAction(cursoId: string, action: Action): Promise<boolean> {
    const res = await fetch(
      `/api/v1/instituciones/${instId}/periodos/${periodoId}/cursos/${cursoId}/${action}`,
      { method: 'POST' }
    )
    return res.ok
  }

  async function handleAction(cursoId: string, action: Action) {
    setLoading(`${cursoId}-${action}`)
    try {
      const ok = await doAction(cursoId, action)
      if (!ok) {
        toast.error('Error al realizar la acción')
        return
      }
      toast.success(`Curso ${ACTION_LABEL[action].toLowerCase()}`)
      router.refresh()
    } catch {
      toast.error('Error de red')
    } finally {
      setLoading(null)
    }
  }

  async function handleBulkAction(action: Action) {
    const applicable = cursos.filter(c => {
      const cerrado = isCerradoParaCurso(periodoCerradoAt, c.override)
      const publicado = isPublicadoParaCurso(periodoPublicadoAt, c.override)
      if (action === 'cerrar') return !cerrado && !publicado
      if (action === 'publicar') return cerrado && !publicado
      if (action === 'reabrir') return cerrado || publicado
      if (action === 'despublicar') return publicado
      return false
    })
    if (applicable.length === 0) return
    setLoading(`bulk-${action}`)
    try {
      const results = await Promise.allSettled(applicable.map(c => doAction(c.id, action)))
      const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value)).length
      if (failed === 0) {
        toast.success(`${applicable.length} curso${applicable.length !== 1 ? 's' : ''} ${ACTION_LABEL[action].toLowerCase()}${applicable.length !== 1 ? 's' : ''}`)
      } else {
        toast.warning(`${applicable.length - failed} ok, ${failed} con error`)
      }
      router.refresh()
    } catch {
      toast.error('Error de red')
    } finally {
      setLoading(null)
    }
  }

  if (cursos.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin cursos en este período.</p>
  }

  const hasCerrable = cursos.some(c => !isCerradoParaCurso(periodoCerradoAt, c.override) && !isPublicadoParaCurso(periodoPublicadoAt, c.override))
  const hasPublicable = cursos.some(c => isCerradoParaCurso(periodoCerradoAt, c.override) && !isPublicadoParaCurso(periodoPublicadoAt, c.override))
  const hasReabrible = cursos.some(c => isCerradoParaCurso(periodoCerradoAt, c.override) || isPublicadoParaCurso(periodoPublicadoAt, c.override))
  const hasDespublicable = cursos.some(c => isPublicadoParaCurso(periodoPublicadoAt, c.override))
  const isBulkLoading = loading?.startsWith('bulk-') ?? false

  return (
    <div className="flex flex-col gap-2">
      {/* Bulk actions */}
      {(hasCerrable || hasPublicable || hasReabrible || hasDespublicable) && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-muted-foreground mr-1">Todos:</span>
          {hasCerrable && (
            <Button variant="outline" size="sm" disabled={loading !== null} onClick={() => handleBulkAction('cerrar')}>
              {loading === 'bulk-cerrar' && <Loader2 data-icon="inline-start" className="animate-spin" />}
              Cerrar todos
            </Button>
          )}
          {hasPublicable && (
            <Button variant="outline" size="sm" disabled={loading !== null} onClick={() => handleBulkAction('publicar')}>
              {loading === 'bulk-publicar' && <Loader2 data-icon="inline-start" className="animate-spin" />}
              Publicar todos
            </Button>
          )}
          {hasDespublicable && (
            <Button variant="outline" size="sm" disabled={loading !== null} onClick={() => handleBulkAction('despublicar')}>
              {loading === 'bulk-despublicar' && <Loader2 data-icon="inline-start" className="animate-spin" />}
              Despublicar todos
            </Button>
          )}
          {hasReabrible && (
            <Button variant="outline" size="sm" disabled={loading !== null} onClick={() => handleBulkAction('reabrir')}>
              {loading === 'bulk-reabrir' && <Loader2 data-icon="inline-start" className="animate-spin" />}
              Reabrir todos
            </Button>
          )}
          {isBulkLoading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Curso</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cursos.map((curso) => {
            const cerrado = isCerradoParaCurso(periodoCerradoAt, curso.override)
            const publicado = isPublicadoParaCurso(periodoPublicadoAt, curso.override)

            return (
              <TableRow key={curso.id}>
                <TableCell className="font-medium">{curso.nombre}</TableCell>
                <TableCell>
                  {publicado ? (
                    <Badge className="bg-green-100 text-green-700 border-green-200">Publicado</Badge>
                  ) : cerrado ? (
                    <Badge variant="warning">Cerrado</Badge>
                  ) : (
                    <Badge variant="outline">Abierto</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {!cerrado && !publicado && (
                      <Button variant="outline" size="sm" disabled={loading !== null} onClick={() => handleAction(curso.id, 'cerrar')}>
                        {loading === `${curso.id}-cerrar` && <Loader2 data-icon="inline-start" className="animate-spin" />}
                        Cerrar
                      </Button>
                    )}
                    {cerrado && !publicado && (
                      <>
                        <Button variant="outline" size="sm" disabled={loading !== null} onClick={() => handleAction(curso.id, 'publicar')}>
                          {loading === `${curso.id}-publicar` && <Loader2 data-icon="inline-start" className="animate-spin" />}
                          Publicar
                        </Button>
                        <Button variant="outline" size="sm" disabled={loading !== null} onClick={() => handleAction(curso.id, 'reabrir')}>
                          {loading === `${curso.id}-reabrir` && <Loader2 data-icon="inline-start" className="animate-spin" />}
                          Reabrir
                        </Button>
                      </>
                    )}
                    {publicado && (
                      <>
                        <Button variant="outline" size="sm" disabled={loading !== null} onClick={() => handleAction(curso.id, 'despublicar')}>
                          {loading === `${curso.id}-despublicar` && <Loader2 data-icon="inline-start" className="animate-spin" />}
                          Despublicar
                        </Button>
                        <Button variant="outline" size="sm" disabled={loading !== null} onClick={() => handleAction(curso.id, 'reabrir')}>
                          {loading === `${curso.id}-reabrir` && <Loader2 data-icon="inline-start" className="animate-spin" />}
                          Reabrir
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
