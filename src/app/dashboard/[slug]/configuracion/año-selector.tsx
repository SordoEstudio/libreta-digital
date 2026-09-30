'use client'

import { useRouter } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Año {
  id: string
  nombre: string
  activo: boolean
}

interface Props {
  años: Año[]
  selectedId: string | undefined
  slug: string
}

export default function AñoSelector({ años, selectedId, slug }: Props) {
  const router = useRouter()
  return (
    <Select
      value={selectedId}
      onValueChange={id => router.push(`/dashboard/${slug}/configuracion?año=${id}`)}
    >
      <SelectTrigger className="w-44">
        <SelectValue placeholder="Seleccionar año...">
          {(() => {
            const a = años.find(x => x.id === selectedId)
            return a ? `${a.nombre}${a.activo ? ' (activo)' : ''}` : undefined
          })()}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {años.map(a => (
          <SelectItem key={a.id} value={a.id}>
            {a.nombre}{a.activo ? ' (activo)' : ''}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
