'use client'

import { useRouter } from 'next/navigation'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { MoreHorizontal, UserX } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  instId: string
  personaId: string
  nombre: string
}

export default function DesactivarUsuarioButton({ instId, personaId, nombre }: Props) {
  const router = useRouter()

  async function handleDesactivar() {
    if (!confirm(`¿Desactivar el acceso de "${nombre}"?`)) return

    const res = await fetch(`/api/v1/instituciones/${instId}/usuarios/${personaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: false }),
    })

    const json = await res.json()

    if (!res.ok) {
      toast.error(json.error?.message ?? 'Error al desactivar')
      return
    }

    toast.success(`Acceso de "${nombre}" desactivado`)
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
          className="text-destructive focus:text-destructive"
          onClick={handleDesactivar}
        >
          <UserX className="size-4" />
          Desactivar acceso
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
