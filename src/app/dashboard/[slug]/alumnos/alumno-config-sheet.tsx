'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  ChevronDown, Loader2, Trash2, Plus, Pencil, X, Link2, Copy, Check,
} from 'lucide-react'
import { cn } from 'cn'
import { toast } from 'sonner'

interface Responsable {
  persona_id: string
  nombre: string
  apellido: string | null
  email: string | null
  telefono: string | null
  dni: string | null
  direccion: string | null
  relacion: string | null
}

interface UsuarioResp {
  persona_id: string
  nombre: string
  apellido: string | null
  email: string | null
}

interface EditState {
  apellido: string
  nombre: string
  telefono: string
  dni: string
  direccion: string
  relacion: string
}

function displayNombre(r: { nombre: string; apellido: string | null }) {
  return r.apellido ? `${r.apellido}, ${r.nombre}` : r.nombre
}

interface Props {
  alumnoId: string
  alumnoNombre: string
  instId: string
  open: boolean
  onOpenChange: (v: boolean) => void
}

export default function AlumnoConfigSheet({ alumnoId, alumnoNombre, instId, open, onOpenChange }: Props) {
  const router = useRouter()

  // Section open states
  const [datosOpen, setDatosOpen] = useState(true)
  const [respOpen, setRespOpen] = useState(true)
  const [accesoOpen, setAccesoOpen] = useState(true)

  // Alumno fields
  const [alumnoPersonaId, setAlumnoPersonaId] = useState<string | null>(null)
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [email, setEmail] = useState('')
  const [fechaNacimiento, setFechaNacimiento] = useState('')
  const [dni, setDni] = useState('')
  const [telefono, setTelefono] = useState('')
  const [direccion, setDireccion] = useState('')
  const [loadingAlumno, setLoadingAlumno] = useState(false)
  const [saving, setSaving] = useState(false)

  // Responsables
  const [responsables, setResponsables] = useState<Responsable[]>([])
  const [disponibles, setDisponibles] = useState<UsuarioResp[]>([])
  const [loadingResp, setLoadingResp] = useState(false)
  const [autoToggling, setAutoToggling] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const [addId, setAddId] = useState('')
  const [addRelacion, setAddRelacion] = useState('')
  const [adding, setAdding] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editState, setEditState] = useState<EditState>({ apellido: '', nombre: '', telefono: '', dni: '', direccion: '', relacion: '' })
  const [savingResp, setSavingResp] = useState(false)

  const [desvinculating, setDesvinculating] = useState<string | null>(null)
  const [confirmDesvincular, setConfirmDesvincular] = useState<string | null>(null)

  // Acceso alumno
  const [tieneAccesoAlumno, setTieneAccesoAlumno] = useState(false)
  const [accesoToggling, setAccesoToggling] = useState(false)
  const [accesoInviteLink, setAccesoInviteLink] = useState<string | null>(null)
  const [accesoInviteEmail, setAccesoInviteEmail] = useState<string | null>(null)
  const [accesoLinkCopied, setAccesoLinkCopied] = useState(false)

  const isAutoResponsable = !!alumnoPersonaId && responsables.some(r => r.persona_id === alumnoPersonaId)

  async function loadAlumno() {
    setLoadingAlumno(true)
    const res = await fetch(`/api/v1/alumnos/${alumnoId}`)
    const json = await res.json()
    const d = json.data ?? {}
    setAlumnoPersonaId(d.persona_id ?? null)
    setTieneAccesoAlumno(!!d.tiene_acceso_alumno)
    setApellido(d.apellido ?? '')
    setNombre(d.nombre ?? '')
    setEmail(d.email ?? '')
    setFechaNacimiento(d.fecha_nacimiento ?? '')
    setDni(d.dni ?? '')
    setTelefono(d.telefono ?? '')
    setDireccion(d.direccion ?? '')
    setLoadingAlumno(false)
  }

  async function loadResponsables() {
    setLoadingResp(true)
    const [respRes, dispRes] = await Promise.all([
      fetch(`/api/v1/alumnos/${alumnoId}/responsables`),
      fetch(`/api/v1/instituciones/${instId}/usuarios?rol=responsable`),
    ])
    const [respJson, dispJson] = await Promise.all([respRes.json(), dispRes.json()])
    setResponsables(respJson.data ?? [])
    setDisponibles(dispJson.data ?? [])
    setLoadingResp(false)
  }

  useEffect(() => {
    if (open) {
      loadAlumno()
      loadResponsables()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function handleSaveDatos(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch(`/api/v1/alumnos/${alumnoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: nombre || undefined,
        apellido: apellido || null,
        email: email || null,
        fecha_nacimiento: fechaNacimiento || null,
        dni: dni || null,
        telefono: telefono || null,
        direccion: direccion || null,
      }),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { toast.error(json.error?.message ?? 'Error al guardar'); return }
    toast.success('Datos actualizados')
    router.refresh()
  }

  async function handleAutoToggle() {
    if (isAutoResponsable) {
      if (!alumnoPersonaId) return
      setAutoToggling(true)
      const res = await fetch(`/api/v1/alumnos/${alumnoId}/responsables/${alumnoPersonaId}`, { method: 'DELETE' })
      const json = await res.json()
      setAutoToggling(false)
      if (!res.ok) { toast.error(json.error?.message ?? 'Error'); return }
      toast.success('Autoresponsable removido')
      await loadResponsables()
      router.refresh()
    } else {
      setAutoToggling(true)
      const res = await fetch(`/api/v1/alumnos/${alumnoId}/autoresponsable`, { method: 'POST' })
      const json = await res.json()
      setAutoToggling(false)
      if (!res.ok) { toast.error(json.error?.message ?? 'Error al asignar'); return }
      if (json.data?.ya_existia) { toast.info('Ya era su propio responsable'); return }
      if (json.data?.setup_url) {
        setInviteLink(json.data.setup_url)
        setInviteEmail(json.data.email)
      } else {
        toast.success('Alumno asignado como responsable')
      }
      await Promise.all([loadAlumno(), loadResponsables()])
      router.refresh()
    }
  }

  async function handleAccesoToggle() {
    setAccesoToggling(true)
    if (tieneAccesoAlumno) {
      const res = await fetch(`/api/v1/alumnos/${alumnoId}/acceso`, { method: 'DELETE' })
      const json = await res.json()
      setAccesoToggling(false)
      if (!res.ok) { toast.error(json.error?.message ?? 'Error'); return }
      setTieneAccesoAlumno(false)
      toast.success('Acceso del alumno revocado')
      router.refresh()
    } else {
      const res = await fetch(`/api/v1/alumnos/${alumnoId}/acceso`, { method: 'POST' })
      const json = await res.json()
      setAccesoToggling(false)
      if (!res.ok) { toast.error(json.error?.message ?? 'Error al asignar acceso'); return }
      if (json.data?.ya_existia) { toast.info('Ya tenía acceso'); setTieneAccesoAlumno(true); return }
      setTieneAccesoAlumno(true)
      if (json.data?.setup_url) {
        setAccesoInviteLink(json.data.setup_url)
        setAccesoInviteEmail(json.data.email)
      } else {
        toast.success('Acceso asignado')
      }
      await loadAlumno()
      router.refresh()
    }
  }

  async function handleAddResp(e: React.FormEvent) {
    e.preventDefault()
    if (!addId) return
    setAdding(true)
    const res = await fetch(`/api/v1/alumnos/${alumnoId}/responsables`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ persona_id: addId, relacion: addRelacion || undefined }),
    })
    const json = await res.json()
    setAdding(false)
    if (!res.ok) { toast.error(json.error?.message ?? 'Error al asignar'); return }
    toast.success('Responsable asignado')
    setAddId('')
    setAddRelacion('')
    await loadResponsables()
    router.refresh()
  }

  async function handleSaveResp(personaId: string) {
    setSavingResp(true)
    const [personaRes, relacionRes] = await Promise.all([
      fetch(`/api/v1/instituciones/${instId}/usuarios/${personaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: editState.nombre || undefined,
          apellido: editState.apellido || null,
          telefono: editState.telefono || null,
          dni: editState.dni || null,
          direccion: editState.direccion || null,
        }),
      }),
      fetch(`/api/v1/alumnos/${alumnoId}/responsables/${personaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ relacion: editState.relacion || null }),
      }),
    ])
    setSavingResp(false)
    if (!personaRes.ok || !relacionRes.ok) { toast.error('Error al guardar'); return }
    toast.success('Datos actualizados')
    setEditingId(null)
    await loadResponsables()
    router.refresh()
  }

  async function handleDesvincular(personaId: string) {
    setDesvinculating(personaId)
    const res = await fetch(`/api/v1/alumnos/${alumnoId}/responsables/${personaId}`, { method: 'DELETE' })
    const json = await res.json()
    setDesvinculating(null)
    if (!res.ok) { toast.error(json.error?.message ?? 'Error al desvincular'); return }
    toast.success('Responsable desvinculado')
    await loadResponsables()
    router.refresh()
  }

  function startEdit(r: Responsable) {
    setEditingId(r.persona_id)
    setEditState({
      apellido: r.apellido ?? '',
      nombre: r.nombre,
      telefono: r.telefono ?? '',
      dni: r.dni ?? '',
      direccion: r.direccion ?? '',
      relacion: r.relacion ?? '',
    })
  }

  const yaAsignados = new Set(responsables.map(r => r.persona_id))
  const disponiblesParaAgregar = disponibles.filter(d => !yaAsignados.has(d.persona_id))

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Configurar alumno</SheetTitle>
          </SheetHeader>
          <div className="mt-2 px-4 text-sm text-muted-foreground truncate">
            {alumnoNombre}
          </div>

          <div className="flex flex-col gap-0 mt-4">
            {/* ── Datos personales ── */}
            <div className="border-t">
              <button
                className="flex items-center justify-between w-full px-4 py-3 text-sm font-semibold text-left"
                onClick={() => setDatosOpen(v => !v)}
              >
                Datos personales
                <ChevronDown className={cn('size-4 text-muted-foreground transition-transform', !datosOpen && '-rotate-90')} />
              </button>

              {datosOpen && (
                <form onSubmit={handleSaveDatos} className="flex flex-col gap-3 px-4 pb-4">
                  {loadingAlumno ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="size-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="ac-apellido">Apellido</Label>
                        <Input
                          id="ac-apellido"
                          value={apellido}
                          onChange={e => setApellido(e.target.value)}
                          placeholder="Ej: García"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="ac-nombre">Nombre(s) *</Label>
                        <Input
                          id="ac-nombre"
                          value={nombre}
                          onChange={e => setNombre(e.target.value)}
                          placeholder="Ej: Juan"
                          required
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="ac-email">Email</Label>
                        <Input
                          id="ac-email"
                          type="email"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          placeholder="alumno@ejemplo.com"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="ac-fecha">Fecha de nacimiento</Label>
                        <Input
                          id="ac-fecha"
                          type="date"
                          value={fechaNacimiento}
                          onChange={e => setFechaNacimiento(e.target.value)}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="ac-dni">DNI / Documento</Label>
                        <Input
                          id="ac-dni"
                          value={dni}
                          onChange={e => setDni(e.target.value)}
                          placeholder="Ej: 40123456"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="ac-tel">Teléfono</Label>
                        <Input
                          id="ac-tel"
                          value={telefono}
                          onChange={e => setTelefono(e.target.value)}
                          placeholder="Ej: +54 9 11 1234-5678"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="ac-dir">Dirección</Label>
                        <Input
                          id="ac-dir"
                          value={direccion}
                          onChange={e => setDireccion(e.target.value)}
                          placeholder="Ej: Av. Corrientes 1234"
                        />
                      </div>
                      <Button type="submit" disabled={saving || !nombre} size="sm">
                        {saving && <Loader2 data-icon="inline-start" className="animate-spin" />}
                        {saving ? 'Guardando...' : 'Guardar datos'}
                      </Button>
                    </>
                  )}
                </form>
              )}
            </div>

            {/* ── Responsables ── */}
            <div className="border-t">
              <button
                className="flex items-center justify-between w-full px-4 py-3 text-sm font-semibold text-left"
                onClick={() => setRespOpen(v => !v)}
              >
                Responsables
                <ChevronDown className={cn('size-4 text-muted-foreground transition-transform', !respOpen && '-rotate-90')} />
              </button>

              {respOpen && (
                <div className="flex flex-col gap-3 px-4 pb-4">
                  {/* Autoresponsable toggle */}
                  <label className={cn('flex items-center gap-2.5 cursor-pointer rounded-lg border px-3 py-2.5', isAutoResponsable && 'border-primary/30 bg-primary/5')}>
                    <input
                      type="checkbox"
                      checked={isAutoResponsable}
                      onChange={handleAutoToggle}
                      disabled={autoToggling || (!isAutoResponsable && !email)}
                      className="size-4 accent-primary"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight">Es su propio responsable</p>
                      {!email && !isAutoResponsable && (
                        <p className="text-xs text-muted-foreground">Requiere email del alumno</p>
                      )}
                    </div>
                    {autoToggling && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
                  </label>

                  {/* Invite link after autoresponsable creation */}
                  {inviteLink && (
                    <div className="flex flex-col gap-2 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-800/50 dark:bg-emerald-950/20">
                      <p className="text-xs text-muted-foreground">
                        Se envió email a <strong>{inviteEmail}</strong>. Si no llega, compartí este link:
                      </p>
                      <div className="flex items-center gap-2 rounded-md border bg-background px-2 py-1.5 text-xs font-mono break-all">
                        <Link2 className="size-3 shrink-0 text-muted-foreground" />
                        <span className="flex-1 text-muted-foreground">{inviteLink}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          await navigator.clipboard.writeText(inviteLink)
                          setCopied(true)
                          setTimeout(() => setCopied(false), 2000)
                        }}
                      >
                        {copied
                          ? <><Check data-icon="inline-start" className="text-green-500" />Copiado</>
                          : <><Copy data-icon="inline-start" />Copiar link</>
                        }
                      </Button>
                    </div>
                  )}

                  {/* Responsables list */}
                  {loadingResp ? (
                    <div className="flex justify-center py-3">
                      <Loader2 className="size-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {responsables.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Sin responsables asignados.</p>
                      ) : (
                        responsables.map(r => (
                          <div key={r.persona_id} className="flex flex-col gap-2 rounded-lg border p-2.5">
                            <div className="flex items-start gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{displayNombre(r)}</p>
                                <p className="text-xs text-muted-foreground truncate">{r.email}</p>
                                {editingId !== r.persona_id && (
                                  <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                                    {r.relacion && <span className="text-xs text-muted-foreground">{r.relacion}</span>}
                                    {r.telefono && <span className="text-xs text-muted-foreground">{r.telefono}</span>}
                                    {!r.relacion && !r.telefono && !r.dni && !r.direccion && (
                                      <span className="text-xs text-muted-foreground italic">Sin datos adicionales</span>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <Button
                                  variant="ghost" size="sm" className="size-7 p-0"
                                  onClick={() => editingId === r.persona_id ? setEditingId(null) : startEdit(r)}
                                >
                                  {editingId === r.persona_id ? <X className="size-3.5" /> : <Pencil className="size-3.5" />}
                                </Button>
                                <Button
                                  variant="ghost" size="sm"
                                  className="size-7 p-0 text-destructive hover:text-destructive"
                                  onClick={() => setConfirmDesvincular(r.persona_id)}
                                  disabled={desvinculating === r.persona_id}
                                >
                                  {desvinculating === r.persona_id
                                    ? <Loader2 className="size-3.5 animate-spin" />
                                    : <Trash2 className="size-3.5" />
                                  }
                                </Button>
                              </div>
                            </div>

                            {editingId === r.persona_id && (
                              <div className="flex flex-col gap-2 pt-2 border-t">
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="flex flex-col gap-1">
                                    <Label className="text-xs">Apellido</Label>
                                    <Input value={editState.apellido} onChange={e => setEditState(s => ({ ...s, apellido: e.target.value }))} className="h-7 text-xs" autoFocus />
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <Label className="text-xs">Nombre(s)</Label>
                                    <Input value={editState.nombre} onChange={e => setEditState(s => ({ ...s, nombre: e.target.value }))} className="h-7 text-xs" />
                                  </div>
                                </div>
                                <div className="flex flex-col gap-1">
                                  <Label className="text-xs">Relación</Label>
                                  <Input value={editState.relacion} onChange={e => setEditState(s => ({ ...s, relacion: e.target.value }))} placeholder="Ej: Madre, Padre, Tutor" className="h-7 text-xs" />
                                </div>
                                <div className="flex flex-col gap-1">
                                  <Label className="text-xs">Teléfono</Label>
                                  <Input value={editState.telefono} onChange={e => setEditState(s => ({ ...s, telefono: e.target.value }))} placeholder="+54 9 11 1234-5678" className="h-7 text-xs" />
                                </div>
                                <p className="text-xs text-muted-foreground">Email: {r.email}</p>
                                <Button size="sm" className="h-7 text-xs" onClick={() => handleSaveResp(r.persona_id)} disabled={savingResp || !editState.nombre}>
                                  {savingResp ? <Loader2 className="size-3 animate-spin mr-1" /> : null}
                                  Guardar
                                </Button>
                              </div>
                            )}
                          </div>
                        ))
                      )}

                      {/* Add responsable */}
                      {disponiblesParaAgregar.length > 0 && (
                        <form onSubmit={handleAddResp} className="flex flex-col gap-2 pt-2 border-t">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Agregar responsable</p>
                          <SearchableSelect
                            value={addId}
                            onValueChange={v => setAddId(v)}
                            placeholder="Seleccionar..."
                            options={disponiblesParaAgregar.map(d => ({
                              value: d.persona_id,
                              label: d.email ? `${displayNombre(d)} (${d.email})` : displayNombre(d),
                            }))}
                            emptyMessage="Sin responsables disponibles"
                          />
                          <Input
                            value={addRelacion}
                            onChange={e => setAddRelacion(e.target.value)}
                            placeholder="Relación (opcional)"
                            className="text-sm"
                          />
                          <Button type="submit" size="sm" variant="outline" disabled={adding || !addId}>
                            {adding && <Loader2 data-icon="inline-start" className="animate-spin" />}
                            <Plus className="size-4" />
                            {adding ? 'Asignando...' : 'Asignar'}
                          </Button>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Acceso del alumno ── */}
            <div className="border-t">
              <button
                className="flex items-center justify-between w-full px-4 py-3 text-sm font-semibold text-left"
                onClick={() => setAccesoOpen(v => !v)}
              >
                Acceso del alumno
                <ChevronDown className={cn('size-4 text-muted-foreground transition-transform', !accesoOpen && '-rotate-90')} />
              </button>

              {accesoOpen && (
                <div className="flex flex-col gap-3 px-4 pb-4">
                  <label className={cn('flex items-center gap-2.5 cursor-pointer rounded-lg border px-3 py-2.5', tieneAccesoAlumno && 'border-primary/30 bg-primary/5')}>
                    <input
                      type="checkbox"
                      checked={tieneAccesoAlumno}
                      onChange={handleAccesoToggle}
                      disabled={accesoToggling || (!tieneAccesoAlumno && !email)}
                      className="size-4 accent-primary"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight">Puede ver su libreta</p>
                      <p className="text-xs text-muted-foreground">
                        {tieneAccesoAlumno
                          ? 'El alumno puede iniciar sesión y ver su boletín'
                          : !email
                            ? 'Requiere email del alumno'
                            : 'El alumno no tiene acceso propio'}
                      </p>
                    </div>
                    {accesoToggling && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
                  </label>

                  {accesoInviteLink && (
                    <div className="flex flex-col gap-2 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-800/50 dark:bg-emerald-950/20">
                      <p className="text-xs text-muted-foreground">
                        Se envió email a <strong>{accesoInviteEmail}</strong>. Si no llega, compartí este link:
                      </p>
                      <div className="flex items-center gap-2 rounded-md border bg-background px-2 py-1.5 text-xs font-mono break-all">
                        <Link2 className="size-3 shrink-0 text-muted-foreground" />
                        <span className="flex-1 text-muted-foreground">{accesoInviteLink}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          await navigator.clipboard.writeText(accesoInviteLink)
                          setAccesoLinkCopied(true)
                          setTimeout(() => setAccesoLinkCopied(false), 2000)
                        }}
                      >
                        {accesoLinkCopied
                          ? <><Check data-icon="inline-start" className="text-green-500" />Copiado</>
                          : <><Copy data-icon="inline-start" />Copiar link</>
                        }
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmDesvincular !== null}
        onOpenChange={v => { if (!v) setConfirmDesvincular(null) }}
        title="¿Desvincular responsable?"
        description="El responsable dejará de tener acceso a la libreta de este alumno."
        confirmLabel="Desvincular"
        destructive
        loading={desvinculating !== null}
        onConfirm={() => {
          const id = confirmDesvincular
          setConfirmDesvincular(null)
          if (id) handleDesvincular(id)
        }}
      />
    </>
  )
}
