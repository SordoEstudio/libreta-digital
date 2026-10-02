'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Loader2, Pencil, UserX, UserCheck } from 'lucide-react'
import { toast } from 'sonner'

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'docente', label: 'Docente' },
  { value: 'responsable', label: 'Responsable' },
]

interface Props {
  instId: string
  personaId: string
  nombre: string
  email: string | null
  rol: string
  activo: boolean
  telefono: string | null
  dni: string | null
  direccion: string | null
}

export default function EditarUsuarioSheet({
  instId, personaId,
  nombre: propNombre, email, rol: propRol, activo: propActivo,
  telefono: propTelefono, dni: propDni, direccion: propDireccion,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState(false)

  const [nombre, setNombre] = useState(propNombre)
  const [rol, setRol] = useState(propRol)
  const [telefono, setTelefono] = useState(propTelefono ?? '')
  const [dni, setDni] = useState(propDni ?? '')
  const [direccion, setDireccion] = useState(propDireccion ?? '')

  function handleOpen() {
    setNombre(propNombre)
    setRol(propRol)
    setTelefono(propTelefono ?? '')
    setDni(propDni ?? '')
    setDireccion(propDireccion ?? '')
    setOpen(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const res = await fetch(`/api/v1/instituciones/${instId}/usuarios/${personaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: nombre || undefined,
        rol: rol || undefined,
        ...(telefono ? { telefono } : {}),
        ...(dni ? { dni } : {}),
        ...(direccion ? { direccion } : {}),
      }),
    })

    const json = await res.json()
    setSaving(false)

    if (!res.ok) {
      toast.error(json.error?.message ?? 'Error al guardar')
      return
    }

    toast.success('Usuario actualizado')
    setOpen(false)
    router.refresh()
  }

  async function handleToggleActivo() {
    const accion = propActivo ? 'desactivar' : 'activar'
    if (!confirm(`¿${propActivo ? 'Desactivar' : 'Activar'} el acceso de "${propNombre}"?`)) return
    setToggling(true)

    const res = await fetch(`/api/v1/instituciones/${instId}/usuarios/${personaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: !propActivo }),
    })

    const json = await res.json()
    setToggling(false)

    if (!res.ok) {
      toast.error(json.error?.message ?? `Error al ${accion}`)
      return
    }

    toast.success(propActivo ? `Acceso de "${propNombre}" desactivado` : `Acceso de "${propNombre}" activado`)
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <Button variant="ghost" size="sm" className="size-8 p-0" onClick={handleOpen} title="Editar">
        <Pencil className="size-3.5" />
        <span className="sr-only">Editar</span>
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Editar usuario</SheetTitle>
          </SheetHeader>

          <form onSubmit={handleSave} className="flex flex-col gap-4 mt-6 px-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="eu-nombre">Nombre *</Label>
              <Input
                id="eu-nombre"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Email</Label>
              <p className="text-sm text-muted-foreground py-1">{email ?? '—'}</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="eu-rol">Rol *</Label>
              <Select value={rol} onValueChange={v => setRol(v ?? rol)}>
                <SelectTrigger id="eu-rol">
                  <SelectValue>
                    {ROLES.find(r => r.value === rol)?.label ?? rol}
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
              <Label htmlFor="eu-tel">Teléfono</Label>
              <Input
                id="eu-tel"
                value={telefono}
                onChange={e => setTelefono(e.target.value)}
                placeholder="+54 9 11 1234-5678"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="eu-dni">DNI / Documento</Label>
              <Input
                id="eu-dni"
                value={dni}
                onChange={e => setDni(e.target.value)}
                placeholder="40123456"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="eu-dir">Dirección</Label>
              <Input
                id="eu-dir"
                value={direccion}
                onChange={e => setDireccion(e.target.value)}
                placeholder="Av. Corrientes 1234"
              />
            </div>

            <Button type="submit" disabled={saving || !nombre} className="mt-2">
              {saving && <Loader2 data-icon="inline-start" className="animate-spin" />}
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t px-4">
            <Button
              variant={propActivo ? 'destructive' : 'outline'}
              className="w-full"
              onClick={handleToggleActivo}
              disabled={toggling}
            >
              {toggling
                ? <Loader2 data-icon="inline-start" className="animate-spin" />
                : propActivo
                  ? <UserX data-icon="inline-start" />
                  : <UserCheck data-icon="inline-start" />
              }
              {propActivo ? 'Desactivar acceso' : 'Activar acceso'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
