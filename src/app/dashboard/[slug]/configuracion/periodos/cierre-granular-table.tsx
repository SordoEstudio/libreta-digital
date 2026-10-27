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
import type { CierrePreview } from '@/lib/cierre-periodo'
import { Loader2, Mail, AlertTriangle, CheckCircle2 } from 'lucide-react'

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
  cursoId: string
  cursoNombres: string[]
  preview?: CierrePreview | null
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
  const [previewLoading, setPreviewLoading] = useState(false)

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

  async function queueAction(cursoId: string, action: Action) {
    const nombre = cursos.find(c => c.id === cursoId)?.nombre ?? cursoId

    if (action === 'cerrar') {
      setPreviewLoading(true)
      setPendingAction({ action, cursoId, cursoNombres: [nombre], preview: null })
      try {
        const res = await fetch(
          `/api/v1/instituciones/${instId}/periodos/${periodoId}/cursos/${cursoId}/cierre-preview`
        )
        const json = await res.json()
        if (res.ok) {
          setPendingAction({ action, cursoId, cursoNombres: [nombre], preview: json.data as CierrePreview })
        } else {
          setPendingAction({ action, cursoId, cursoNombres: [nombre], preview: undefined })
        }
      } catch {
        setPendingAction({ action, cursoId, cursoNombres: [nombre], preview: undefined })
      } finally {
        setPreviewLoading(false)
      }
      return
    }

    setPendingAction({ action, cursoId, cursoNombres: [nombre] })
  }

  async function executeConfirmed() {
    if (!pendingAction) return
    const { action, cursoId } = pendingAction
    setPendingAction(null)
    if (cursoId) {
      await handleAction(cursoId, action)
    }
  }

  if (cursos.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin cursos en este período.</p>
  }

  const preview = pendingAction?.preview ?? null

  return (
    <>
      <AlertDialog open={pendingAction !== null} onOpenChange={open => { if (!open) setPendingAction(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction && `¿${ACTION_VERB[pendingAction.action]} ${pendingAction.cursoNombres[0]}?`}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="flex flex-col gap-3">
                <p>{pendingAction && ACTION_DESCRIPTION[pendingAction.action]}</p>

                {pendingAction?.action === 'cerrar' && (
                  previewLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                      Verificando datos del período...
                    </div>
                  ) : preview ? (
                    preview.completo ? (
                      <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-800">
                        <CheckCircle2 className="size-4 mt-0.5 shrink-0" />
                        <span>Todos los datos están completos.</span>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
                          <AlertTriangle className="size-4 mt-0.5 shrink-0" />
                          <span>Podés cerrar igual, pero estos datos quedarán incompletos.</span>
                        </div>
                        {preview.materias_sin_notas.length > 0 && (
                          <div className="text-sm">
                            <p className="font-medium mb-1">Alumnos sin notas completas:</p>
                            <ul className="flex flex-col gap-1">
                              {preview.materias_sin_notas.map(m => (
                                <li key={m.materia_id} className="text-muted-foreground">
                                  <span className="font-medium text-foreground">{m.materia_nombre}</span>
                                  {m.show_alumnos ? (
                                    <>
                                      {' '}
                                      <span className="text-xs">({m.alumnos_faltantes}/{m.total_alumnos})</span>
                                      <ul className="list-disc list-inside ml-3 mt-0.5 space-y-0.5">
                                        {m.alumnos.map(a => (
                                          <li key={a.alumno_id}>{a.alumno_nombre}</li>
                                        ))}
                                      </ul>
                                    </>
                                  ) : (
                                    <span className="text-xs ml-1">(todos — {m.total_alumnos} alumnos)</span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {preview.materias_sin_asistencia.length > 0 && (
                          <div className="text-sm">
                            <p className="font-medium mb-1">Materias sin asistencia:</p>
                            <ul className="flex flex-col gap-0.5">
                              {preview.materias_sin_asistencia.map(m => (
                                <li key={m.materia_id} className="text-muted-foreground">{m.materia_nombre}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )
                  ) : null
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={executeConfirmed} disabled={previewLoading}>
              {previewLoading
                ? <><Loader2 className="size-4 animate-spin mr-1" />Verificando...</>
                : pendingAction ? ACTION_VERB[pendingAction.action] : ''}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex flex-col gap-2">
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
                        <Button size="sm" disabled={loading !== null} onClick={() => queueAction(curso.id, 'cerrar')}>
                          {loading === `${curso.id}-cerrar` && <Loader2 data-icon="inline-start" className="animate-spin" />}
                          Cerrar
                        </Button>
                      )}
                      {cerrado && !publicado && (
                        <>
                          <Button variant="outline" size="sm" disabled={loading !== null} onClick={() => queueAction(curso.id, 'reabrir')}>
                            {loading === `${curso.id}-reabrir` && <Loader2 data-icon="inline-start" className="animate-spin" />}
                            Reabrir
                          </Button>
                          <Button size="sm" disabled={loading !== null} onClick={() => queueAction(curso.id, 'publicar')}>
                            {loading === `${curso.id}-publicar` && <Loader2 data-icon="inline-start" className="animate-spin" />}
                            Publicar
                          </Button>
                        </>
                      )}
                      {publicado && (
                        <>
                          <Button variant="outline" size="sm" disabled={loading !== null} onClick={() => queueAction(curso.id, 'reabrir')}>
                            {loading === `${curso.id}-reabrir` && <Loader2 data-icon="inline-start" className="animate-spin" />}
                            Reabrir
                          </Button>
                          <Button variant="outline" size="sm" disabled={loading !== null} onClick={() => queueAction(curso.id, 'despublicar')}>
                            {loading === `${curso.id}-despublicar` && <Loader2 data-icon="inline-start" className="animate-spin" />}
                            Despublicar
                          </Button>
                          <Button size="sm" disabled={loading !== null} onClick={() => queueAction(curso.id, 'notificar')}>
                            {loading === `${curso.id}-notificar`
                              ? <Loader2 data-icon="inline-start" className="animate-spin" />
                              : <Mail data-icon="inline-start" />}
                            Notificar
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
