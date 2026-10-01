'use client'

import { useRouter } from 'next/navigation'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { MoreHorizontal, UserX, UserCheck } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  instId: string
  personaId: string
  nombre: string
  activo: boolean
}

export default function DesactivarUsuarioButton({ instId, personaId, nombre, activo }: Props) {
  const router = useRouter()

  async function handleToggle() {
    const accion = activo ? 'desactivar' : 'activar'
    if (!confirm(`¿${activo ? 'Desactivar' : 'Activar'} el acceso de "${nombre}"?`)) return

    const res = await fetch(`/api/v1/instituciones/${instId}/usuarios/${personaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: !activo }),
    })

    const json = await res.json()

    if (!res.ok) {
      toast.error(json.error?.message ?? `Error al ${accion}`)
      return
    }

    toast.success(`Acceso de "${nombre}" ${activo ? 'desactivado' : 'activado'}`)
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="size-8 p-0" />}>
        <MoreHorizontal className="size-4" />
        <span className="sr-only">Acciones</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          className={activo ? 'text-destructive focus:text-destructive' : ''}
          onClick={handleToggle}
        >
          {activo
            ? <><UserX className="size-4" />Desactivar acceso</>
            : <><UserCheck className="size-4" />Activar acceso</>
          }
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
