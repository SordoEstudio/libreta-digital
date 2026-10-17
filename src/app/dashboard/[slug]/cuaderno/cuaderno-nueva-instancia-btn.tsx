'use client'

import NuevaEvalRefSheet from '@/components/eval-ref/nueva-eval-ref-sheet'

interface Periodo { id: string; nombre: string; orden: number }
interface Dimension { id: string; nombre: string; orden: number }

interface Props {
  materiaId: string
  periodos: Periodo[]
  dimensiones: Dimension[]
}

export default function CuadernoNuevaInstanciaBtn({ materiaId, periodos, dimensiones }: Props) {
  return <NuevaEvalRefSheet materiaId={materiaId} periodos={periodos} dimensiones={dimensiones} />
}
