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
  slug: string
}

type Action = 'cerrar' | 'publicar' | 'reabrir' | 'despublicar'

export default function CierreGranularTable({
  instId,
  periodoId,
  cursos,
  periodoCerradoAt,
  periodoPublicadoAt,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function handleAction(cursoId: string, action: Action) {
    setLoading(`${cursoId}-${action}`)
    try {
      const res = await fetch(
        `/api/v1/instituciones/${instId}/periodos/${periodoId}/cursos/${cursoId}/${action}`,
        { method: 'POST' }
      )
      if (!res.ok) {
        const data = await res.json()
        toast.error(data?.error?.message ?? 'Error al realizar la acción')
        return
      }
      toast.success(
        action === 'cerrar'
          ? 'Curso cerrado'
          : action === 'publicar'
            ? 'Curso publicado'
            : action === 'reabrir'
              ? 'Curso reabierto'
              : 'Curso despublicado'
      )
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

  return (
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
                  <Badge className="bg-green-100 text-green-700 border-green-200">
                    Publicado
                  </Badge>
                ) : cerrado ? (
                  <Badge variant="warning">
                    Cerrado
                  </Badge>
                ) : (
                  <Badge variant="outline">
                    Abierto
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  {!cerrado && !publicado && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={loading !== null}
                      onClick={() => handleAction(curso.id, 'cerrar')}
                    >
                      {loading === `${curso.id}-cerrar` && (
                        <Loader2 data-icon="inline-start" className="animate-spin" />
                      )}
                      Cerrar
                    </Button>
                  )}
                  {cerrado && !publicado && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={loading !== null}
                        onClick={() => handleAction(curso.id, 'publicar')}
                      >
                        {loading === `${curso.id}-publicar` && (
                          <Loader2 data-icon="inline-start" className="animate-spin" />
                        )}
                        Publicar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={loading !== null}
                        onClick={() => handleAction(curso.id, 'reabrir')}
                      >
                        {loading === `${curso.id}-reabrir` && (
                          <Loader2 data-icon="inline-start" className="animate-spin" />
                        )}
                        Reabrir
                      </Button>
                    </>
                  )}
                  {publicado && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={loading !== null}
                        onClick={() => handleAction(curso.id, 'despublicar')}
                      >
                        {loading === `${curso.id}-despublicar` && (
                          <Loader2 data-icon="inline-start" className="animate-spin" />
                        )}
                        Despublicar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={loading !== null}
                        onClick={() => handleAction(curso.id, 'reabrir')}
                      >
                        {loading === `${curso.id}-reabrir` && (
                          <Loader2 data-icon="inline-start" className="animate-spin" />
                        )}
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
  )
}
