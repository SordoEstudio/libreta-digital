'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, BookOpen, ArrowRightLeft, UserCheck, UserX, Settings2 } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import AlumnoConfigSheet from './alumno-config-sheet'
import CambiarCursoSheet from './cambiar-curso-sheet'

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
  const [configOpen, setConfigOpen] = useState(false)
  const [cursoOpen, setCursoOpen] = useState(false)
  const [toggling, setToggling] = useState(false)

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
          <DropdownMenuItem onClick={() => setConfigOpen(true)}>
            <Settings2 className="size-4" />
            Configurar
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setCursoOpen(true)}>
            <ArrowRightLeft className="size-4" />
            Cambiar curso
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

      <AlumnoConfigSheet
        alumnoId={alumnoId}
        alumnoNombre={alumnoNombre}
        instId={instId}
        open={configOpen}
        onOpenChange={setConfigOpen}
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
