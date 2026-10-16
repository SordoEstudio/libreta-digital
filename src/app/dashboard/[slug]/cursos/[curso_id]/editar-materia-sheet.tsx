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
import { Pencil, Save, Plus, Trash2, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'

const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

export interface HorarioSlot {
  id: string
  dia_semana: number
  hora_inicio: string
  hora_fin: string
  aula: string | null
}

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
}

interface Plantilla {
  id: string
  nombre: string
}

function displayNombre(d: Docente) {
  return d.apellido ? `${d.apellido}, ${d.nombre}` : d.nombre
}

interface Props {
  materiaId: string
  materiaNombre: string
  docenteActual: Docente | null
  horariosActuales: HorarioSlot[]
  initialDimensiones: Dimension[]
  instId: string
}

export default function EditarMateriaSheet({
  materiaId,
  materiaNombre,
  docenteActual,
  horariosActuales,
  initialDimensiones,
  instId,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  // Docente
  const originalDocenteId = docenteActual?.persona_id ?? ''
  const [docenteId, setDocenteId] = useState(originalDocenteId)
  const [docentes, setDocentes] = useState<Docente[]>(docenteActual?.nombre ? [docenteActual] : [])
  const [loadingDocentes, setLoadingDocentes] = useState(false)
  const [savingDocente, setSavingDocente] = useState(false)
  const docenteChanged = docenteId !== originalDocenteId

  // Horarios
  const [horarios, setHorarios] = useState<HorarioSlot[]>(horariosActuales)
  const [showForm, setShowForm] = useState(false)
  const [dia, setDia] = useState('1')
  const [horaInicio, setHoraInicio] = useState('08:00')
  const [horaFin, setHoraFin] = useState('09:00')
  const [aula, setAula] = useState('')
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Dimensiones
  const [dimensiones, setDimensiones] = useState<Dimension[]>(initialDimensiones)
  const [dimNombre, setDimNombre] = useState('')
  const [dimAdding, setDimAdding] = useState(false)
  const [dimDeletingId, setDimDeletingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; notasCount: number } | null>(null)
  const [plantillas, setPlantillas] = useState<Plantilla[]>([])
  const [plantillaId, setPlantillaId] = useState('')
  const [applyingPlantilla, setApplyingPlantilla] = useState(false)

  useEffect(() => {
    if (!open) return
    setDimensiones(initialDimensiones)
    setLoadingDocentes(true)
    fetch(`/api/v1/instituciones/${instId}/usuarios?rol=docente`)
      .then(r => r.json())
      .then(json => setDocentes((json.data ?? []).filter((d: { activo: boolean }) => d.activo)))
      .catch(() => {})
      .finally(() => setLoadingDocentes(false))
    fetch(`/api/v1/instituciones/${instId}/dimension-plantillas`)
      .then(r => r.ok ? r.json() : { data: [] })
      .then(json => setPlantillas((json.data ?? []) as Plantilla[]))
      .catch(() => {})
  }, [open, instId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSaveDocente() {
    setSavingDocente(true)
    const res = await fetch(`/api/v1/materias/${materiaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docentes_ids: docenteId ? [docenteId] : [] }),
    })
    setSavingDocente(false)
    if (res.ok) {
      toast.success('Docente actualizado')
      router.refresh()
    } else {
      const json = await res.json().catch(() => ({}))
      toast.error(json.error?.message ?? 'Error al actualizar docente')
    }
  }

  async function handleAddHorario() {
    setAdding(true)
    const res = await fetch(`/api/v1/materias/${materiaId}/horarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dia_semana: parseInt(dia),
        hora_inicio: horaInicio,
        hora_fin: horaFin,
        aula: aula.trim() || undefined,
      }),
    })
    const json = await res.json()
    setAdding(false)
    if (!res.ok) {
      toast.error(json.error?.message ?? 'Error al agregar horario')
      return
    }
    setHorarios(prev =>
      [...prev, json.data].sort((a, b) =>
        a.dia_semana !== b.dia_semana
          ? a.dia_semana - b.dia_semana
          : a.hora_inicio.localeCompare(b.hora_inicio)
      )
    )
    setAula('')
    setDia('1')
    setHoraInicio('08:00')
    setHoraFin('09:00')
    setShowForm(false)
    router.refresh()
  }

  async function handleDeleteHorario(horarioId: string) {
    setDeletingId(horarioId)
    const res = await fetch(`/api/v1/materias/${materiaId}/horarios/${horarioId}`, { method: 'DELETE' })
    setDeletingId(null)
    if (!res.ok) {
      toast.error('Error al eliminar horario')
      return
    }
    setHorarios(prev => prev.filter(h => h.id !== horarioId))
    router.refresh()
  }

  function handleCancelForm() {
    setShowForm(false)
    setDia('1')
    setHoraInicio('08:00')
    setHoraFin('09:00')
    setAula('')
  }

  async function handleAddDim() {
    if (!dimNombre.trim()) return
    setDimAdding(true)
    const res = await fetch(`/api/v1/materias/${materiaId}/dimensiones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: dimNombre.trim() }),
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
            {/* Docente */}
            <div className="flex flex-col gap-3">
              <p className="text-sm font-semibold">Docente</p>
              <Select
                value={docenteId}
                onValueChange={v => setDocenteId(v ?? '')}
                disabled={loadingDocentes}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder={loadingDocentes ? 'Cargando...' : 'Sin docente asignado'}>
                    {docenteId
                      ? ((() => { const found = docentes.find(d => d.persona_id === docenteId); return found ? displayNombre(found) : 'Docente' })())
                      : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin docente</SelectItem>
                  {docentes.map(d => (
                    <SelectItem key={d.persona_id} value={d.persona_id}>
                      {displayNombre(d)}
                    </SelectItem>
                  ))}
                  {docentes.length === 0 && !loadingDocentes && (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      Sin docentes registrados
                    </div>
                  )}
                </SelectContent>
              </Select>
              {docenteChanged && (
                <Button size="sm" onClick={handleSaveDocente} disabled={savingDocente}>
                  {savingDocente
                    ? <Loader2 data-icon="inline-start" className="animate-spin" />
                    : <Save data-icon="inline-start" />}
                  {savingDocente ? 'Guardando...' : 'Guardar docente'}
                </Button>
              )}
            </div>

            {/* Horarios */}
            <div className="flex flex-col gap-3 border-t pt-5">
              <p className="text-sm font-semibold">Horarios</p>

              {horarios.length > 0 && (
                <div className="flex flex-col gap-1">
                  {horarios.map(horario => (
                    <div key={horario.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                      <span className="font-medium">{DIAS[horario.dia_semana]}</span>
                      <span className="text-muted-foreground">
                        {horario.hora_inicio.slice(0, 5)}–{horario.hora_fin.slice(0, 5)}
                        {horario.aula ? ` · ${horario.aula}` : ''}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="size-7 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteHorario(horario.id)}
                        disabled={deletingId === horario.id}
                      >
                        {deletingId === horario.id
                          ? <Loader2 className="size-3.5 animate-spin" />
                          : <Trash2 className="size-3.5" />}
                        <span className="sr-only">Eliminar horario</span>
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {!showForm ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setShowForm(true)}
                >
                  <Plus data-icon="inline-start" />
                  Agregar horario
                </Button>
              ) : (
                <div className="flex flex-col gap-3 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Nuevo horario</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="size-7 p-0 text-muted-foreground"
                      onClick={handleCancelForm}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label>Día</Label>
                    <Select value={dia} onValueChange={v => setDia(v ?? '1')}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue>{DIAS[parseInt(dia)]}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {DIAS.slice(1).map((d, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1.5">
                      <Label>Hora inicio</Label>
                      <Input
                        type="time"
                        value={horaInicio}
                        onChange={e => setHoraInicio(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label>Hora fin</Label>
                      <Input
                        type="time"
                        value={horaFin}
                        onChange={e => setHoraFin(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label>Aula <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                    <Input
                      placeholder="Ej: Aula 3B"
                      value={aula}
                      onChange={e => setAula(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>

                  <Button onClick={handleAddHorario} disabled={adding}>
                    {adding
                      ? <Loader2 data-icon="inline-start" className="animate-spin" />
                      : <Save data-icon="inline-start" />}
                    {adding ? 'Guardando...' : 'Confirmar horario'}
                  </Button>
                </div>
              )}
            </div>

            {/* Dimensiones */}
            <div className="flex flex-col gap-3 border-t pt-5">
              <p className="text-sm font-semibold">Dimensiones</p>

              {dimensiones.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin dimensiones configuradas.</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {dimensiones.map(d => (
                    <div key={d.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                      <p className="text-sm font-medium">{d.nombre}</p>
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
        </SheetContent>
      </Sheet>
    </>
  )
}
