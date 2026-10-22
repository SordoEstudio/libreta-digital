'use client'

import { useRouter } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Props {
  periodos: Array<{ id: string; nombre: string }>
  activePeriodoId: string
  slug: string
}

export default function PeriodoSelectNav({ periodos, activePeriodoId, slug }: Props) {
  const router = useRouter()
  return (
    <Select
      value={activePeriodoId}
      onValueChange={value => router.replace(`/dashboard/${slug}/acuses?periodo_id=${value}`)}
    >
      <SelectTrigger className="w-48">
        <SelectValue placeholder="Período">
          {periodos.find(p => p.id === activePeriodoId)?.nombre ?? 'Período'}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {periodos.map(p => (
          <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
