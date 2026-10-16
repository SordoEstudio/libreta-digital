'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  alumnoId: string
  alumnoNombre: string
  open: boolean
  onOpenChange: (v: boolean) => void
}

export default function EditarAlumnoSheet({ alumnoId, alumnoNombre, open, onOpenChange }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [fechaNacimiento, setFechaNacimiento] = useState('')
  const [dni, setDni] = useState('')
  const [telefono, setTelefono] = useState('')
  const [direccion, setDireccion] = useState('')

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch(`/api/v1/alumnos/${alumnoId}`)
      .then(r => r.json())
      .then(json => {
        const d = json.data ?? {}
        setNombre(d.nombre ?? '')
        setApellido(d.apellido ?? '')
        setFechaNacimiento(d.fecha_nacimiento ?? '')
        setDni(d.dni ?? '')
        setTelefono(d.telefono ?? '')
        setDireccion(d.direccion ?? '')
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open, alumnoId])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const res = await fetch(`/api/v1/alumnos/${alumnoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: nombre || undefined,
        apellido: apellido || null,
        fecha_nacimiento: fechaNacimiento || null,
        dni: dni || null,
        telefono: telefono || null,
        direccion: direccion || null,
      }),
    })

    const json = await res.json()
    setSaving(false)

    if (!res.ok) {
      toast.error(json.error?.message ?? 'Error al guardar')
      return
    }

    toast.success('Datos actualizados')
    onOpenChange(false)
    router.refresh()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Editar alumno — {alumnoNombre}</SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="flex justify-center mt-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="flex flex-col gap-4 mt-6 px-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ea-apellido">Apellido</Label>
              <Input
                id="ea-apellido"
                value={apellido}
                onChange={e => setApellido(e.target.value)}
                placeholder="Ej: García"
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ea-nombre">Nombre(s) *</Label>
              <Input
                id="ea-nombre"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Ej: Juan"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ea-fecha">Fecha de nacimiento</Label>
              <Input
                id="ea-fecha"
                type="date"
                value={fechaNacimiento}
                onChange={e => setFechaNacimiento(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ea-dni">DNI / Documento</Label>
              <Input
                id="ea-dni"
                value={dni}
                onChange={e => setDni(e.target.value)}
                placeholder="Ej: 40123456"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ea-tel">Teléfono</Label>
              <Input
                id="ea-tel"
                value={telefono}
                onChange={e => setTelefono(e.target.value)}
                placeholder="Ej: +54 9 11 1234-5678"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ea-dir">Dirección</Label>
              <Input
                id="ea-dir"
                value={direccion}
                onChange={e => setDireccion(e.target.value)}
                placeholder="Ej: Av. Corrientes 1234"
              />
            </div>

            <Button type="submit" disabled={saving || !nombre} className="mt-2">
              {saving && <Loader2 data-icon="inline-start" className="animate-spin" />}
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </form>
        )}
      </SheetContent>
    </Sheet>
  )
}
