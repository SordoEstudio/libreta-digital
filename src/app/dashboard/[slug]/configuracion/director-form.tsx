'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface Props {
  instId:         string
  directorNombre: string
  directorCargo:  string
}

export default function DirectorForm({ instId, directorNombre, directorCargo }: Props) {
  const router = useRouter()
  const [nombre, setNombre] = useState(directorNombre)
  const [cargo, setCargo] = useState(directorCargo)
  const [loading, setLoading] = useState(false)

  const unchanged = nombre === directorNombre && cargo === directorCargo

  async function handleSave() {
    setLoading(true)
    const res = await fetch(`/api/v1/instituciones/${instId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        director_cargo:  cargo.trim() || 'Director/a',
        director_nombre: nombre.trim() || null,
      }),
    })
    setLoading(false)
    if (res.ok) {
      toast.success('Director/a actualizado')
      router.refresh()
    } else {
      const json = await res.json()
      toast.error(json.error?.message ?? 'Error al actualizar')
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Cargo</label>
        <Input
          value={cargo}
          onChange={e => setCargo(e.target.value)}
          className="w-36"
          placeholder="Director/a"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Nombre</label>
        <Input
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          className="w-52"
          placeholder="Lic. María García"
        />
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleSave}
        disabled={loading || unchanged}
      >
        {loading && <Loader2 data-icon="inline-start" className="animate-spin" />}
        Guardar
      </Button>
    </div>
  )
}
