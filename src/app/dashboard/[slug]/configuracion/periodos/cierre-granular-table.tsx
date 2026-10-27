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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { isCerradoParaCurso, isPublicadoParaCurso } from '@/lib/cierre-periodo'
import { Loader2, Mail } from 'lucide-react'

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

type Action = 'cerrar' | 'publicar' | 'reabrir' | 'despublicar' | 'notificar'

interface PendingAction {
  action: Action
  cursoId: string | null  // null = bulk
  cursoNombres: string[]
}

const ACTION_LABEL: Record<Action, string> = {
  cerrar: 'Cerrado',
  publicar: 'Publicado',
  reabrir: 'Reabierto',
  despublicar: 'Despublicado',
  notificar: 'Notificado',
}

const ACTION_VERB: Record<Action, string> = {
  cerrar: 'Cerrar',
  publicar: 'Publicar',
  reabrir: 'Reabrir',
  despublicar: 'Despublicar',
  notificar: 'Notificar',
}

const ACTION_DESCRIPTION: Record<Action, string> = {
  cerrar: 'Los docentes no podrán cargar ni modificar notas. El cierre se puede deshacer.',
  publicar: 'El boletín quedará visible para los responsables de los alumnos.',
  reabrir: 'Se revertirá el cierre y la publicación. Los docentes volverán a tener acceso.',
  despublicar: 'El boletín dejará de ser visible para los responsables.',
  notificar: 'Se enviará un email de notificación a los responsables de los alumnos inscriptos.',
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
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)

  function getApplicable(action: Action) {
    return cursos.filter(c => {
      const cerrado = isCerradoParaCurso(periodoCerradoAt, c.override)
      const publicado = isPublicadoParaCurso(periodoPublicadoAt, c.override)
      if (action === 'cerrar') return !cerrado && !publicado
      if (action === 'publicar') return cerrado && !publicado
      if (action === 'reabrir') return cerrado || publicado
      if (action === 'despublicar') return publicado
      if (action === 'notificar') return publicado
      return false
    })
  }

  async function doAction(cursoId: string, action: Action): Promise<{ ok: boolean; enviados?: number; errores?: number }> {
    const res = await fetch(
      `/api/v1/instituciones/${instId}/periodos/${periodoId}/cursos/${cursoId}/${action}`,
      { method: 'POST' }
    )
    if (action === 'notificar' && res.ok) {
      const json = await res.json()
      return { ok: true, enviados: json.data?.enviados ?? 0, errores: json.data?.errores ?? 0 }
    }
    return { ok: res.ok }
  }

  async function handleAction(cursoId: string, action: Action) {
    setLoading(`${cursoId}-${action}`)
    try {
      const result = await doAction(cursoId, action)
      if (!result.ok) {
        toast.error('Error al realizar la acción')
        return
      }
      if (action === 'notificar') {
        toast.success(`${result.enviados} email${result.enviados !== 1 ? 's' : ''} enviados`)
        if ((result.errores ?? 0) > 0) toast.error(`${result.errores} errores al enviar`)
      } else {
        toast.success(`Curso ${ACTION_LABEL[action].toLowerCase()}`)
        router.refresh()
      }
    } catch {
      toast.error('Error de red')
    } finally {
      setLoading(null)
    }
  }

  async function handleBulkAction(action: Action) {
    const applicable = getApplicable(action)
    if (applicable.length === 0) return
    setLoading(`bulk-${action}`)
    try {
      const results = await Promise.allSettled(applicable.map(c => doAction(c.id, action)))
      if (action === 'notificar') {
        const totalEnviados = results.reduce((sum, r) => sum + (r.status === 'fulfilled' ? (r.value.enviados ?? 0) : 0), 0)
        const totalErrores = results.reduce((sum, r) => sum + (r.status === 'fulfilled' ? (r.value.errores ?? 0) : 0), 0)
        toast.success(`${totalEnviados} email${totalEnviados !== 1 ? 's' : ''} enviados`)
        if (totalErrores > 0) toast.error(`${totalErrores} errores al enviar`)
      } else {
        const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok)).length
        if (failed === 0) {
          toast.success(`${applicable.length} curso${applicable.length !== 1 ? 's' : ''} ${ACTION_LABEL[action].toLowerCase()}${applicable.length !== 1 ? 's' : ''}`)
        } else {
          toast.warning(`${applicable.length - failed} ok, ${failed} con error`)
        }
        router.refresh()
      }
    } catch {
      toast.error('Error de red')
    } finally {
      setLoading(null)
    }
  }

  function queueAction(cursoId: string, action: Action) {
    const nombre = cursos.find(c => c.id === cursoId)?.nombre ?? cursoId
    setPendingAction({ action, cursoId, cursoNombres: [nombre] })
  }

  function queueBulkAction(action: Action) {
    const applicable = getApplicable(action)
    if (applicable.length === 0) return
    setPendingAction({ action, cursoId: null, cursoNombres: applicable.map(c => c.nombre) })
  }

  async function executeConfirmed() {
    if (!pendingAction) return
    const { action, cursoId } = pendingAction
    setPendingAction(null)
    if (cursoId) {
      await handleAction(cursoId, action)
    } else {
      await handleBulkAction(action)
    }
  }

  if (cursos.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin cursos en este período.</p>
  }

  const hasCerrable = cursos.some(c => !isCerradoParaCurso(periodoCerradoAt, c.override) && !isPublicadoParaCurso(periodoPublicadoAt, c.override))
  const hasPublicable = cursos.some(c => isCerradoParaCurso(periodoCerradoAt, c.override) && !isPublicadoParaCurso(periodoPublicadoAt, c.override))
  const hasReabrible = cursos.some(c => isCerradoParaCurso(periodoCerradoAt, c.override) || isPublicadoParaCurso(periodoPublicadoAt, c.override))
  const hasDespublicable = cursos.some(c => isPublicadoParaCurso(periodoPublicadoAt, c.override))
  const hasNotificable = cursos.some(c => isPublicadoParaCurso(periodoPublicadoAt, c.override))
  const isBulkLoading = loading?.startsWith('bulk-') ?? false

  const dialogTitle = pendingAction
    ? pendingAction.cursoNombres.length === 1
      ? `¿${ACTION_VERB[pendingAction.action]} ${pendingAction.cursoNombres[0]}?`
      : `¿${ACTION_VERB[pendingAction.action]} ${pendingAction.cursoNombres.length} cursos?`
    : ''

  const dialogCursosList = pendingAction && pendingAction.cursoNombres.length > 1
    ? pendingAction.cursoNombres.slice(0, 5).join(', ') +
      (pendingAction.cursoNombres.length > 5 ? ` y ${pendingAction.cursoNombres.length - 5} más` : '')
    : null

  return (
    <>
      <AlertDialog open={pendingAction !== null} onOpenChange={open => { if (!open) setPendingAction(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction && ACTION_DESCRIPTION[pendingAction.action]}
              {dialogCursosList && (
                <> <span className="text-xs">({dialogCursosList})</span></>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={executeConfirmed}>
              {pendingAction ? ACTION_VERB[pendingAction.action] : ''}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex flex-col gap-2">
        {/* Bulk actions */}
        {(hasCerrable || hasPublicable || hasReabrible || hasDespublicable || hasNotificable) && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-muted-foreground mr-1">Todos:</span>
            {hasCerrable && (
              <Button variant="outline" size="sm" disabled={loading !== null} onClick={() => queueBulkAction('cerrar')}>
                {loading === 'bulk-cerrar' && <Loader2 data-icon="inline-start" className="animate-spin" />}
                Cerrar todos
              </Button>
            )}
            {hasPublicable && (
              <Button variant="outline" size="sm" disabled={loading !== null} onClick={() => queueBulkAction('publicar')}>
                {loading === 'bulk-publicar' && <Loader2 data-icon="inline-start" className="animate-spin" />}
                Publicar todos
              </Button>
            )}
            {hasDespublicable && (
              <Button variant="outline" size="sm" disabled={loading !== null} onClick={() => queueBulkAction('despublicar')}>
                {loading === 'bulk-despublicar' && <Loader2 data-icon="inline-start" className="animate-spin" />}
                Despublicar todos
              </Button>
            )}
            {hasReabrible && (
              <Button variant="outline" size="sm" disabled={loading !== null} onClick={() => queueBulkAction('reabrir')}>
                {loading === 'bulk-reabrir' && <Loader2 data-icon="inline-start" className="animate-spin" />}
                Reabrir todos
              </Button>
            )}
            {hasNotificable && (
              <Button variant="outline" size="sm" disabled={loading !== null} onClick={() => queueBulkAction('notificar')}>
                {loading === 'bulk-notificar'
                  ? <Loader2 data-icon="inline-start" className="animate-spin" />
                  : <Mail data-icon="inline-start" />}
                Notificar todos
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
                        <Button variant="outline" size="sm" disabled={loading !== null} onClick={() => queueAction(curso.id, 'cerrar')}>
                          {loading === `${curso.id}-cerrar` && <Loader2 data-icon="inline-start" className="animate-spin" />}
                          Cerrar
                        </Button>
                      )}
                      {cerrado && !publicado && (
                        <>
                          <Button variant="outline" size="sm" disabled={loading !== null} onClick={() => queueAction(curso.id, 'publicar')}>
                            {loading === `${curso.id}-publicar` && <Loader2 data-icon="inline-start" className="animate-spin" />}
                            Publicar
                          </Button>
                          <Button variant="outline" size="sm" disabled={loading !== null} onClick={() => queueAction(curso.id, 'reabrir')}>
                            {loading === `${curso.id}-reabrir` && <Loader2 data-icon="inline-start" className="animate-spin" />}
                            Reabrir
                          </Button>
                        </>
                      )}
                      {publicado && (
                        <>
                          <Button variant="outline" size="sm" disabled={loading !== null} onClick={() => queueAction(curso.id, 'notificar')}>
                            {loading === `${curso.id}-notificar`
                              ? <Loader2 data-icon="inline-start" className="animate-spin" />
                              : <Mail data-icon="inline-start" />}
                            Notificar
                          </Button>
                          <Button variant="outline" size="sm" disabled={loading !== null} onClick={() => queueAction(curso.id, 'despublicar')}>
                            {loading === `${curso.id}-despublicar` && <Loader2 data-icon="inline-start" className="animate-spin" />}
                            Despublicar
                          </Button>
                          <Button variant="outline" size="sm" disabled={loading !== null} onClick={() => queueAction(curso.id, 'reabrir')}>
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
    </>
  )
}
