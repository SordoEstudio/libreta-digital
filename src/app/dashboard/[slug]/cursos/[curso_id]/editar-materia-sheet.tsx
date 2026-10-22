'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Pencil, Save, Plus, Trash2, Loader2, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface Docente {
  persona_id: string
  nombre: string
  apellido?: string | null
}

interface Dimension {
  id: string
  nombre: string
  peso: number | null
  orden: number
  tipo: string
}

interface Plantilla {
  id: string
  nombre: string
}

interface Unidad {
  id: string
  nombre: string
  orden: number
}

function displayNombre(d: Docente) {
  return d.apellido ? `${d.apellido}, ${d.nombre}` : d.nombre
}

interface Props {
  materiaId: string
  materiaNombre: string
  docentesActuales: Docente[]
  initialDimensiones: Dimension[]
  instId: string
  initialUnidades?: Unidad[]
}

export default function EditarMateriaSheet({
  materiaId,
  materiaNombre,
  docentesActuales,
  initialDimensiones,
  instId,
  initialUnidades = [],
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  // Docentes
  const originalDocenteIds = docentesActuales.map(d => d.persona_id)
  const [docenteIds, setDocenteIds] = useState<string[]>(originalDocenteIds)
  const [docentes, setDocentes] = useState<Docente[]>(docentesActuales)
  const [loadingDocentes, setLoadingDocentes] = useState(false)
  const [savingDocente, setSavingDocente] = useState(false)
  const docenteChanged = JSON.stringify([...docenteIds].sort()) !== JSON.stringify([...originalDocenteIds].sort())

  // Dimensiones
  const [dimensiones, setDimensiones] = useState<Dimension[]>(initialDimensiones)
  const [dimNombre, setDimNombre] = useState('')
  const [dimTipo, setDimTipo] = useState<'numerico' | 'conceptual'>('numerico')
  const [dimAdding, setDimAdding] = useState(false)
  const [dimDeletingId, setDimDeletingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; notasCount: number } | null>(null)
  const [plantillas, setPlantillas] = useState<Plantilla[]>([])
  const [plantillaId, setPlantillaId] = useState('')
  const [applyingPlantilla, setApplyingPlantilla] = useState(false)

  // Unidades
  const [unidades, setUnidades] = useState<Unidad[]>(initialUnidades)
  const [unidadNombre, setUnidadNombre] = useState('')
  const [unidadAdding, setUnidadAdding] = useState(false)
  const [unidadDeletingId, setUnidadDeletingId] = useState<string | null>(null)
  const [confirmDeleteUnidad, setConfirmDeleteUnidad] = useState<Unidad | null>(null)

  // Collapsible sections
  const [dimOpen, setDimOpen] = useState(true)
  const [unidadOpen, setUnidadOpen] = useState(true)

  useEffect(() => {
    if (!open) return
    setDimensiones(initialDimensiones)
    setLoadingDocentes(true)
    fetch(`/api/v1/instituciones/${instId}/usuarios?rol=docente`)
      .then(r => r.json())
      .then(json => setDocentes((json.data ?? []).filter((d: { activo: boolean }) => d.activo) as Docente[]))
      .catch(() => {})
      .finally(() => setLoadingDocentes(false))
    fetch(`/api/v1/instituciones/${instId}/dimension-plantillas`)
      .then(r => r.ok ? r.json() : { data: [] })
      .then(json => setPlantillas((json.data ?? []) as Plantilla[]))
      .catch(() => {})
    const supabase = createClient()
    supabase
      .from('unidades')
      .select('id, nombre, orden')
      .eq('materia_id', materiaId)
      .is('deleted_at', null)
      .order('orden')
      .then(({ data: uniData }) => {
        setUnidades((uniData ?? []) as Unidad[])
      })
  }, [open, instId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSaveDocente() {
    setSavingDocente(true)
    const res = await fetch(`/api/v1/materias/${materiaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docentes_ids: docenteIds }),
    })
    setSavingDocente(false)
    if (res.ok) {
      toast.success('Docentes actualizados')
      router.refresh()
    } else {
      const json = await res.json().catch(() => ({}))
      toast.error(json.error?.message ?? 'Error al actualizar docentes')
    }
  }

  function toggleDocente(personaId: string) {
    setDocenteIds(prev =>
      prev.includes(personaId) ? prev.filter(id => id !== personaId) : [...prev, personaId]
    )
  }

  async function handleAddDim() {
    if (!dimNombre.trim()) return
    setDimAdding(true)
    const res = await fetch(`/api/v1/materias/${materiaId}/dimensiones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: dimNombre.trim(), tipo: dimTipo }),
    })
    const json = await res.json()
    setDimAdding(false)
    if (res.ok) {
      setDimensiones(prev => [...prev, json.data])
      setDimNombre('')
      toast.success('Dimensión agregada')
      router.refresh()
    } else {
      toast.error(json.error?.message ?? 'Error al agregar dimensión')
    }
  }

  async function handleDeleteDim(dimId: string, force = false) {
    setDimDeletingId(dimId)
    const url = `/api/v1/materias/${materiaId}/dimensiones/${dimId}${force ? '?confirm=true' : ''}`
    const res = await fetch(url, { method: 'DELETE' })
    const json = await res.json()
    setDimDeletingId(null)
    if (res.ok) {
      setDimensiones(prev => prev.filter(d => d.id !== dimId))
      setConfirmDelete(null)
      toast.success('Dimensión eliminada')
      router.refresh()
    } else if (res.status === 409 && json.error?.code === 'HAS_NOTAS') {
      setConfirmDelete({ id: dimId, notasCount: json.error.notasCount ?? 0 })
    } else {
      toast.error(json.error?.message ?? 'Error al eliminar dimensión')
    }
  }

  async function handleApplyPlantilla() {
    if (!plantillaId) return
    setApplyingPlantilla(true)
    const res = await fetch(`/api/v1/materias/${materiaId}/dimensiones/aplicar-plantilla`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plantilla_id: plantillaId }),
    })
    const json = await res.json()
    setApplyingPlantilla(false)
    if (res.ok) {
      toast.success('Plantilla aplicada')
      const dimRes = await fetch(`/api/v1/materias/${materiaId}/dimensiones`)
      if (dimRes.ok) {
        const dimJson = await dimRes.json()
        setDimensiones(dimJson.data ?? [])
      }
      setPlantillaId('')
      router.refresh()
    } else {
      toast.error(json.error?.message ?? 'Error al aplicar plantilla')
    }
  }

  async function handleAddUnidad() {
    if (!unidadNombre.trim()) return
    setUnidadAdding(true)
    const res = await fetch(`/api/v1/materias/${materiaId}/unidades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: unidadNombre.trim() }),
    })
    if (res.ok) {
      const created = await res.json()
      const nueva: Unidad = {
        id: created.data.id,
        nombre: created.data.nombre,
        orden: created.data.orden,
      }
      setUnidades(prev => [...prev, nueva])
      setUnidadNombre('')
      toast.success('Unidad agregada')
    } else {
      toast.error('Error al agregar unidad')
    }
    setUnidadAdding(false)
  }

  async function handleDeleteUnidad(unidad: Unidad) {
    setUnidadDeletingId(unidad.id)
    const res = await fetch(`/api/v1/unidades/${unidad.id}`, { method: 'DELETE' })
    setUnidadDeletingId(null)
    setConfirmDeleteUnidad(null)
    if (res.ok) {
      setUnidades(prev => prev.filter(u => u.id !== unidad.id))
      toast.success('Unidad eliminada')
    } else {
      toast.error('Error al eliminar unidad')
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="size-7 p-0 shrink-0 -mr-1 text-muted-foreground hover:text-foreground"
        onClick={() => setOpen(true)}
      >
        <Pencil className="size-3.5" />
        <span className="sr-only">Editar materia</span>
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{materiaNombre}</SheetTitle>
          </SheetHeader>

          <div className="flex flex-col gap-6 mt-6 px-4 overflow-y-auto">
            {/* Docentes */}
            <div className="flex flex-col gap-3">
              <p className="text-sm font-semibold">Docentes</p>
              {loadingDocentes ? (
                <p className="text-sm text-muted-foreground">Cargando...</p>
              ) : docentes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin docentes registrados</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {docentes.map(d => (
                    <label key={d.persona_id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="size-4 accent-primary"
                        checked={docenteIds.includes(d.persona_id)}
                        onChange={() => toggleDocente(d.persona_id)}
                      />
                      <span className="text-sm">{displayNombre(d)}</span>
                    </label>
                  ))}
                </div>
              )}
              {docenteChanged && (
                <Button size="sm" onClick={handleSaveDocente} disabled={savingDocente}>
                  {savingDocente
                    ? <Loader2 data-icon="inline-start" className="animate-spin" />
                    : <Save data-icon="inline-start" />}
                  {savingDocente ? 'Guardando...' : 'Guardar docentes'}
                </Button>
              )}
            </div>

            {/* Dimensiones */}
            <div className="flex flex-col gap-3 border-t pt-5">
              <button
                className="flex items-center justify-between text-sm font-semibold text-left w-full"
                onClick={() => setDimOpen(v => !v)}
              >
                Dimensiones
                <ChevronDown className={`size-4 text-muted-foreground transition-transform ${dimOpen ? '' : '-rotate-90'}`} />
              </button>

              {dimOpen && (
                <>
                  {dimensiones.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin dimensiones configuradas.</p>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {dimensiones.map(d => (
                        <div key={d.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <p className="text-sm font-medium truncate">{d.nombre}</p>
                            {d.tipo === 'conceptual' && (
                              <span className="shrink-0 text-xs bg-violet-100 text-violet-700 rounded px-1.5 py-0.5">Conceptual</span>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => handleDeleteDim(d.id)}
                            disabled={dimDeletingId === d.id}
                          >
                            {dimDeletingId === d.id
                              ? <Loader2 className="size-3.5 animate-spin" />
                              : <Trash2 className="size-3.5 text-destructive" />}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Nueva dimensión"
                        value={dimNombre}
                        onChange={e => setDimNombre(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddDim() } }}
                        className="h-8 text-sm"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleAddDim}
                        disabled={dimAdding || !dimNombre.trim()}
                        className="shrink-0"
                      >
                        {dimAdding ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                      </Button>
                    </div>
                    <Select value={dimTipo} onValueChange={v => setDimTipo(v as 'numerico' | 'conceptual')}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="numerico">Numérico</SelectItem>
                        <SelectItem value="conceptual">Conceptual (E / MB / B / R / I)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {plantillas.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <select
                        value={plantillaId}
                        onChange={e => setPlantillaId(e.target.value)}
                        className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                      >
                        <option value="">Aplicar plantilla…</option>
                        {plantillas.map(p => (
                          <option key={p.id} value={p.id}>{p.nombre}</option>
                        ))}
                      </select>
                      {plantillaId && (
                        <AlertDialog>
                          <AlertDialogTrigger render={<Button variant="secondary" size="sm" disabled={applyingPlantilla} />}>
                            {applyingPlantilla && <Loader2 data-icon="inline-start" className="animate-spin" />}
                            Aplicar plantilla
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Reemplazar dimensiones?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esto eliminará las dimensiones actuales y las reemplazará con las de la plantilla.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={handleApplyPlantilla}>Confirmar</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Unidades */}
            <div className="flex flex-col gap-3 border-t pt-5">
              <button
                className="flex items-center justify-between text-sm font-semibold text-left w-full"
                onClick={() => setUnidadOpen(v => !v)}
              >
                Unidades
                <ChevronDown className={`size-4 text-muted-foreground transition-transform ${unidadOpen ? '' : '-rotate-90'}`} />
              </button>

              {unidadOpen && (
                <>
                  {unidades.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin unidades configuradas.</p>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {unidades.map(u => (
                        <div key={u.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                          <p className="text-sm font-medium">{u.nombre}</p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => setConfirmDeleteUnidad(u)}
                            disabled={unidadDeletingId === u.id}
                          >
                            {unidadDeletingId === u.id
                              ? <Loader2 className="size-3.5 animate-spin" />
                              : <Trash2 className="size-3.5 text-destructive" />}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Input
                      placeholder="Nueva unidad"
                      value={unidadNombre}
                      onChange={e => setUnidadNombre(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void handleAddUnidad() } }}
                      className="h-8 text-sm"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleAddUnidad()}
                      disabled={unidadAdding || !unidadNombre.trim()}
                      className="shrink-0"
                    >
                      {unidadAdding ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>

          {confirmDelete && (
            <AlertDialog open onOpenChange={v => { if (!v) setConfirmDelete(null) }}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar dimensión?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Hay {confirmDelete.notasCount} nota{confirmDelete.notasCount !== 1 ? 's' : ''} vinculada{confirmDelete.notasCount !== 1 ? 's' : ''} a esta dimensión.
                    Al eliminarla, esas notas quedarán sin dimensión asignada. Esta acción no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleDeleteDim(confirmDelete.id, true)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Eliminar de todas formas
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {confirmDeleteUnidad && (
            <AlertDialog open onOpenChange={v => { if (!v) setConfirmDeleteUnidad(null) }}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar &quot;{confirmDeleteUnidad.nombre}&quot;?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Se quitará la unidad de todas las evaluaciones asignadas.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => void handleDeleteUnidad(confirmDeleteUnidad)}
                    disabled={unidadDeletingId === confirmDeleteUnidad.id}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {unidadDeletingId === confirmDeleteUnidad.id && <Loader2 data-icon="inline-start" className="animate-spin" />}
                    Eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
