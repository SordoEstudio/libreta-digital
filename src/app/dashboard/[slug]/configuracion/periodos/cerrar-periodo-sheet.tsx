'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import type { CierrePreview } from '@/lib/cierre-periodo'

interface Props {
  instId: string
  periodoId: string
  periodoNombre: string
}

export default function CerrarPeriodoSheet({ instId, periodoId, periodoNombre }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<CierrePreview | null>(null)
  const [activarSiguiente, setActivarSiguiente] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  async function handleOpen() {
    setOpen(true)
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/instituciones/${instId}/periodos/${periodoId}/cierre-preview`)
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error?.message ?? 'Error al cargar preview')
        setOpen(false)
      } else {
        setPreview(json.data)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleCerrar() {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/v1/instituciones/${instId}/periodos/${periodoId}/cerrar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activar_siguiente: activarSiguiente }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error?.message ?? 'Error al cerrar período')
        return
      }
      const msg = json.data.siguiente_activado
        ? `Período cerrado. Siguiente período activado.`
        : 'Período cerrado.'
      toast.success(msg)
      setOpen(false)
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleOpen}>
        Cerrar período
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Cerrar {periodoNombre}</SheetTitle>
          </SheetHeader>

          <div className="flex flex-col gap-4 mt-6 px-4">
            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Verificando datos del período...
              </div>
            )}

            {!loading && preview && (
              <>
                {preview.completo ? (
                  <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                    <CheckCircle2 className="size-4 mt-0.5 shrink-0" />
                    <span>Todos los datos están completos. Podés cerrar el período.</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      <AlertTriangle className="size-4 mt-0.5 shrink-0" />
                      <span>Podés cerrar igual, pero estos datos quedarán incompletos.</span>
                    </div>

                    {preview.materias_sin_notas.length > 0 && (
                      <div className="text-sm">
                        <p className="font-medium mb-2">Alumnos sin notas completas:</p>
                        <ul className="flex flex-col gap-1.5">
                          {preview.materias_sin_notas.map(m => (
                            <li key={m.materia_id} className="text-muted-foreground">
                              <span className="font-medium text-foreground">
                                {m.curso_nombre} — {m.materia_nombre}
                              </span>
                              {m.show_alumnos ? (
                                <>
                                  {' '}
                                  <span className="text-xs">
                                    ({m.alumnos_faltantes}/{m.total_alumnos})
                                  </span>
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
                        <p className="font-medium mb-2">Materias sin asistencia cargada:</p>
                        <ul className="flex flex-col gap-0.5">
                          {preview.materias_sin_asistencia.map(m => (
                            <li key={m.materia_id} className="text-muted-foreground">
                              <span className="font-medium text-foreground">{m.curso_nombre}</span>
                              {' — '}
                              {m.materia_nombre}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    id="activar-siguiente"
                    type="checkbox"
                    checked={activarSiguiente}
                    onChange={e => setActivarSiguiente(e.target.checked)}
                    className="size-4"
                  />
                  <label htmlFor="activar-siguiente" className="text-sm">
                    Activar siguiente período automáticamente
                  </label>
                </div>

                <Button onClick={handleCerrar} disabled={submitting} variant="destructive">
                  {submitting && <Loader2 data-icon="inline-start" className="animate-spin" />}
                  Cerrar período
                </Button>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
