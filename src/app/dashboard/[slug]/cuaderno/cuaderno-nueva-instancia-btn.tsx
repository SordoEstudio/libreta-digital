'use client'

import NuevaEvalRefSheet from '@/components/eval-ref/nueva-eval-ref-sheet'

interface Periodo { id: string; nombre: string; orden: number }
interface Dimension { id: string; nombre: string; orden: number }
export interface UnidadBtn { id: string; nombre: string; orden: number; fecha_inicio: string | null; fecha_fin: string | null }

interface Props {
  materiaId: string
  periodos: Periodo[]
  dimensiones: Dimension[]
  unidades?: UnidadBtn[]
}

export default function CuadernoNuevaInstanciaBtn({ materiaId, periodos, dimensiones, unidades }: Props) {
  return <NuevaEvalRefSheet materiaId={materiaId} periodos={periodos} dimensiones={dimensiones} unidades={unidades ?? []} />
}
