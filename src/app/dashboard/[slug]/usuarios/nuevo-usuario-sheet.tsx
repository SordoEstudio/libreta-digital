'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Loader2, Plus, Copy, Check, Link2 } from 'lucide-react'
import { toast } from 'sonner'

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'docente', label: 'Docente' },
  { value: 'responsable', label: 'Responsable' },
]

interface Alumno {
  id: string
  nombre: string
}

interface Props {
  instId: string
}

export default function NuevoUsuarioSheet({ instId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [rol, setRol] = useState('')
  const [telefono, setTelefono] = useState('')
  const [dni, setDni] = useState('')
  const [direccion, setDireccion] = useState('')
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // G8: assign alumnos after creating a responsable
  const [personaIdCreada, setPersonaIdCreada] = useState<string | null>(null)
  const [alumnos, setAlumnos] = useState<Alumno[]>([])
  const [alumnoQuery, setAlumnoQuery] = useState('')
  const [alumnosSeleccionados, setAlumnosSeleccionados] = useState<Set<string>>(new Set())
  const [loadingAlumnos, setLoadingAlumnos] = useState(false)
  const [asignando, setAsignando] = useState(false)
  const [asignacionHecha, setAsignacionHecha] = useState(false)

  useEffect(() => {
    if (!inviteLink || rol !== 'responsable') return
    setLoadingAlumnos(true)
    fetch(`/api/v1/instituciones/${instId}/alumnos?activo=true`)
      .then(r => r.json())
      .then(j => setAlumnos(j.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingAlumnos(false))
  }, [inviteLink, rol, instId])

  function handleClose(v: boolean) {
    setOpen(v)
    if (!v) {
      setNombre('')
      setEmail('')
      setRol('')
      setTelefono('')
      setDni('')
      setDireccion('')
      setInviteLink(null)
      setCopied(false)
      setPersonaIdCreada(null)
      setAlumnos([])
      setAlumnoQuery('')
      setAlumnosSeleccionados(new Set())
      setLoadingAlumnos(false)
      setAsignando(false)
      setAsignacionHecha(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const res = await fetch(`/api/v1/instituciones/${instId}/usuarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre, email, rol, send_invite: true,
        ...(telefono && { telefono }),
        ...(dni && { dni }),
        ...(direccion && { direccion }),
      }),
    })

    const json = await res.json()
    setLoading(false)

    if (!res.ok) {
      toast.error(json.error?.message ?? 'Error al crear usuario')
      return
    }

    if (json.data?.setup_url) {
      setInviteLink(json.data.setup_url)
      setPersonaIdCreada(json.data.persona_id ?? null)
    } else {
      toast.success(`Usuario "${nombre}" agregado.`)
      handleClose(false)
    }

    router.refresh()
  }

  async function handleCopy() {
    if (!inviteLink) return
    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function toggleAlumno(id: string) {
    setAlumnosSeleccionados(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleAsignar() {
    if (!personaIdCreada || alumnosSeleccionados.size === 0) return
    setAsignando(true)

    const results = await Promise.all(
      Array.from(alumnosSeleccionados).map(async alumnoId => {
        const res = await fetch(`/api/v1/alumnos/${alumnoId}/responsables`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ persona_id: personaIdCreada }),
        })
        return res.ok
      })
    )

    const failed = results.filter(ok => !ok).length
    setAsignando(false)
    setAsignacionHecha(true)

    if (failed > 0) {
      toast.error(`${failed} asignación(es) fallaron`)
    } else {
      toast.success(`${alumnosSeleccionados.size} alumno(s) asignado(s)`)
    }

    router.refresh()
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus data-icon="inline-start" />
        Nuevo usuario
      </Button>

      <Sheet open={open} onOpenChange={handleClose}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Nuevo usuario</SheetTitle>
          </SheetHeader>

          {inviteLink ? (
            <div className="flex flex-col gap-4 mt-6 px-4">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium">
                  Usuario <strong>{nombre}</strong> creado.
                </p>
                <p className="text-sm text-muted-foreground">
                  Se envió un email a <strong>{email}</strong>. Si no llega, compartí este link:
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-xs font-mono break-all">
                  <Link2 className="size-3 shrink-0 text-muted-foreground" />
                  <span className="flex-1 text-muted-foreground">{inviteLink}</span>
                </div>
                <Button variant="outline" onClick={handleCopy} className="w-full">
                  {copied
                    ? <><Check data-icon="inline-start" className="text-green-500" />Copiado</>
                    : <><Copy data-icon="inline-start" />Copiar link</>
                  }
                </Button>
              </div>

              {rol === 'responsable' && (
                <div className="flex flex-col gap-3 pt-3 border-t">
                  <p className="text-sm font-medium">Asignar alumnos <span className="text-xs font-normal text-muted-foreground">(opcional)</span></p>

                  {loadingAlumnos ? (
                    <div className="flex justify-center py-3">
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : alumnos.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Sin alumnos activos registrados.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <Input
                        placeholder="Buscar alumno..."
                        value={alumnoQuery}
                        onChange={e => setAlumnoQuery(e.target.value)}
                        disabled={asignacionHecha}
                        className="h-8 text-sm"
                      />
                      <div className="flex flex-col gap-0.5 max-h-44 overflow-y-auto rounded-md border divide-y">
                        {alumnos
                          .filter(a => a.nombre.toLowerCase().includes(alumnoQuery.toLowerCase()))
                          .map(a => (
                            <label
                              key={a.id}
                              className="flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer hover:bg-muted/50 transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={alumnosSeleccionados.has(a.id)}
                                onChange={() => toggleAlumno(a.id)}
                                className="size-4 accent-primary"
                                disabled={asignacionHecha}
                              />
                              {a.nombre}
                            </label>
                          ))}
                      </div>
                    </div>
                  )}

                  {!asignacionHecha && alumnos.length > 0 && (
                    <Button
                      onClick={handleAsignar}
                      disabled={asignando || alumnosSeleccionados.size === 0}
                      variant="outline"
                    >
                      {asignando && <Loader2 data-icon="inline-start" className="animate-spin" />}
                      {asignando ? 'Asignando...' : `Asignar ${alumnosSeleccionados.size > 0 ? `(${alumnosSeleccionados.size})` : ''}`}
                    </Button>
                  )}

                  {asignacionHecha && (
                    <p className="text-xs text-muted-foreground">
                      Alumnos asignados. Podés editar los responsables desde la página de Alumnos.
                    </p>
                  )}
                </div>
              )}

              <Button onClick={() => handleClose(false)} className="mt-2">
                Listo
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-6 px-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="us-nombre">Nombre *</Label>
                <Input
                  id="us-nombre"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="Ej: María González"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="us-email">Email *</Label>
                <Input
                  id="us-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="usuario@ejemplo.com"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="us-rol">Rol *</Label>
                <Select value={rol} onValueChange={v => setRol(v ?? '')}>
                  <SelectTrigger id="us-rol">
                    <SelectValue placeholder="Seleccionar rol...">
                      {rol ? ROLES.find(r => r.value === rol)?.label : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map(r => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="us-tel">Teléfono</Label>
                <Input
                  id="us-tel"
                  value={telefono}
                  onChange={e => setTelefono(e.target.value)}
                  placeholder="Ej: +54 9 11 1234-5678"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="us-dni">DNI / Documento</Label>
                <Input
                  id="us-dni"
                  value={dni}
                  onChange={e => setDni(e.target.value)}
                  placeholder="Ej: 40123456"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="us-dir">Dirección</Label>
                <Input
                  id="us-dir"
                  value={direccion}
                  onChange={e => setDireccion(e.target.value)}
                  placeholder="Ej: Av. Corrientes 1234"
                />
              </div>

              <p className="text-xs text-muted-foreground">
                Se creará una cuenta y se enviará un email de bienvenida con link de acceso.
              </p>

              <Button type="submit" disabled={loading || !nombre || !email || !rol} className="mt-2">
                {loading && <Loader2 data-icon="inline-start" className="animate-spin" />}
                {loading ? 'Creando...' : 'Crear usuario'}
              </Button>
            </form>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
