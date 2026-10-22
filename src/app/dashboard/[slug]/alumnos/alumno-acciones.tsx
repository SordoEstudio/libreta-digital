'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, BookOpen, Users, ArrowRightLeft, UserCheck, UserX, Pencil, UserCog } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import ResponsablesSheet from './responsables-sheet'
import CambiarCursoSheet from './cambiar-curso-sheet'
import EditarAlumnoSheet from './editar-alumno-sheet'

interface Props {
  alumnoId: string
  alumnoNombre: string
  activo: boolean
  instId: string
  slug: string
  cursos: Array<{ id: string; nombre: string }>
}

export default function AlumnoAcciones({ alumnoId, alumnoNombre, activo, instId, slug, cursos }: Props) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [respOpen, setRespOpen] = useState(false)
  const [cursoOpen, setCursoOpen] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [asignando, setAsignando] = useState(false)

  async function handleAutoResponsable() {
    setAsignando(true)
    const res = await fetch(`/api/v1/alumnos/${alumnoId}/autoresponsable`, { method: 'POST' })
    const json = await res.json()
    setAsignando(false)

    if (!res.ok) {
      toast.error(json.error?.message ?? 'Error al asignar responsable')
      return
    }

    if (json.data?.ya_existia) {
      toast.info('El alumno ya era su propio responsable')
      return
    }

    if (json.data?.setup_url) {
      toast.success('Responsable creado', {
        description: 'Copiá el link de activación y enviáselo al alumno.',
        action: {
          label: 'Copiar link',
          onClick: () => navigator.clipboard.writeText(json.data.setup_url),
        },
        duration: 12000,
      })
    } else {
      toast.success('Alumno asignado como responsable', {
        description: `Se envió invitación a ${json.data?.email ?? ''}`,
      })
    }
    router.refresh()
  }

  async function handleToggleActivo() {
    setToggling(true)

    const res = await fetch(`/api/v1/alumnos/${alumnoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: !activo }),
    })

    const json = await res.json()
    setToggling(false)

    if (!res.ok) {
      toast.error(json.error?.message ?? 'Error al actualizar')
      return
    }

    toast.success(activo ? 'Alumno desactivado' : 'Alumno activado')
    router.refresh()
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="size-8 p-0" disabled={toggling} />}>
          <MoreHorizontal className="size-4" />
          <span className="sr-only">Acciones</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem render={<Link href={`/dashboard/${slug}/libreta/${alumnoId}`} />}>
            <BookOpen className="size-4" />
            Ver libreta
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            Editar datos
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setRespOpen(true)}>
            <Users className="size-4" />
            Responsables
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setCursoOpen(true)}>
            <ArrowRightLeft className="size-4" />
            Cambiar curso
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleAutoResponsable} disabled={asignando}>
            <UserCog className="size-4" />
            Responsable de sí mismo
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleToggleActivo}>
            {activo ? (
              <><UserX className="size-4" />Desactivar</>
            ) : (
              <><UserCheck className="size-4" />Activar</>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditarAlumnoSheet
        alumnoId={alumnoId}
        alumnoNombre={alumnoNombre}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <ResponsablesSheet
        alumnoId={alumnoId}
        alumnoNombre={alumnoNombre}
        instId={instId}
        open={respOpen}
        onOpenChange={setRespOpen}
      />
      <CambiarCursoSheet
        alumnoId={alumnoId}
        alumnoNombre={alumnoNombre}
        cursos={cursos}
        open={cursoOpen}
        onOpenChange={setCursoOpen}
      />
    </>
  )
}
