'use client'

import { useRouter } from 'next/navigation'

interface Materia { id: string; nombre: string; cursoNombre: string }
interface Periodo { id: string; nombre: string }

interface Props {
  slug: string
  materias: Materia[]
  periodos: Periodo[]
  selectedMateriaId: string | null
  selectedPeriodoId: string | null
}

export default function CuadernoSelectores({
  slug, materias, periodos, selectedMateriaId, selectedPeriodoId,
}: Props) {
  const router = useRouter()

  function onMateriaChange(materiaId: string) {
    router.push(`/dashboard/${slug}/cuaderno?materia_id=${materiaId}`)
  }

  function onPeriodoChange(periodoId: string) {
    if (!selectedMateriaId) return
    if (periodoId === '__todos__') {
      router.push(`/dashboard/${slug}/cuaderno?materia_id=${selectedMateriaId}`)
    } else {
      router.push(`/dashboard/${slug}/cuaderno?materia_id=${selectedMateriaId}&periodo_id=${periodoId}`)
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="flex flex-col gap-1 min-w-0 sm:min-w-52">
        <label className="text-xs text-muted-foreground font-medium">Materia</label>
        <select
          value={selectedMateriaId ?? ''}
          onChange={e => onMateriaChange(e.target.value)}
          className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="" disabled>Seleccionar materia…</option>
          {materias.map(m => (
            <option key={m.id} value={m.id}>{m.nombre} — {m.cursoNombre}</option>
          ))}
        </select>
      </div>

      {selectedMateriaId && (
        <div className="flex flex-col gap-1 min-w-0 sm:min-w-40">
          <label className="text-xs text-muted-foreground font-medium">Período</label>
          <select
            value={selectedPeriodoId ?? '__todos__'}
            onChange={e => onPeriodoChange(e.target.value)}
            className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="__todos__">Todos</option>
            {periodos.map(p => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
            <option value="__anual__">Anual</option>
          </select>
        </div>
      )}
    </div>
  )
}
