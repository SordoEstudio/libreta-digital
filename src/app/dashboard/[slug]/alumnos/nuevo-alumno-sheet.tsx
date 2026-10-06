'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  instId: string
  cursos: Array<{ id: string; nombre: string }>
}

export default function NuevoAlumnoSheet({ instId, cursos }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [cursoId, setCursoId] = useState('')
  const [fechaNacimiento, setFechaNacimiento] = useState('')
  const [dni, setDni] = useState('')
  const [telefono, setTelefono] = useState('')
  const [direccion, setDireccion] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const body: Record<string, string> = { nombre }
    if (apellido) body.apellido = apellido
    if (cursoId) body.curso_id = cursoId
    if (fechaNacimiento) body.fecha_nacimiento = fechaNacimiento
    if (dni) body.dni = dni
    if (telefono) body.telefono = telefono
    if (direccion) body.direccion = direccion

    const res = await fetch(`/api/v1/instituciones/${instId}/alumnos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const json = await res.json()
    setLoading(false)

    if (!res.ok) {
      toast.error(json.error?.message ?? 'Error al crear alumno')
      return
    }

    toast.success(`Alumno "${apellido ? `${apellido}, ` : ''}${nombre}" registrado`)
    setOpen(false)
    setNombre('')
    setApellido('')
    setCursoId('')
    setFechaNacimiento('')
    setDni('')
    setTelefono('')
    setDireccion('')
    router.refresh()
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus data-icon="inline-start" />
        Nuevo alumno
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Nuevo alumno</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-6 px-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="al-apellido">Apellido *</Label>
              <Input
                id="al-apellido"
                value={apellido}
                onChange={e => setApellido(e.target.value)}
                placeholder="Ej: García"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="al-nombre">Nombre(s) *</Label>
              <Input
                id="al-nombre"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Ej: Juan"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="al-curso">Curso</Label>
              <Select value={cursoId} onValueChange={v => setCursoId(v ?? '')}>
                <SelectTrigger id="al-curso">
                  <SelectValue placeholder="Asignar curso...">
                    {cursoId ? cursos.find(c => c.id === cursoId)?.nombre : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {cursos.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="al-fecha">Fecha de nacimiento</Label>
              <Input
                id="al-fecha"
                type="date"
                value={fechaNacimiento}
                onChange={e => setFechaNacimiento(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="al-dni">DNI / Documento</Label>
              <Input
                id="al-dni"
                value={dni}
                onChange={e => setDni(e.target.value)}
                placeholder="Ej: 40123456"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="al-tel">Teléfono</Label>
              <Input
                id="al-tel"
                value={telefono}
                onChange={e => setTelefono(e.target.value)}
                placeholder="Ej: +54 9 11 1234-5678"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="al-dir">Dirección</Label>
              <Input
                id="al-dir"
                value={direccion}
                onChange={e => setDireccion(e.target.value)}
                placeholder="Ej: Av. Corrientes 1234"
              />
            </div>

            <Button type="submit" disabled={loading || !nombre || !apellido} className="mt-2">
              {loading && <Loader2 data-icon="inline-start" className="animate-spin" />}
              {loading ? 'Registrando...' : 'Registrar alumno'}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  )
}
