import EditarEvalRefSheet from '@/components/eval-ref/editar-eval-ref-sheet'

interface Periodo { id: string; nombre: string; orden: number }
interface Dimension { id: string; nombre: string; orden: number }

interface Props {
  evalRefId: string
  evalRefNombre: string
  evalRefTipo: 'numerica' | 'conceptual'
  evalRefFecha: string | null
  evalRefPeriodoId: string | null
  evalRefDimensionIds: string[]
  periodos: Periodo[]
  dimensiones: Dimension[]
}

export default function EvalRefAcciones({
  evalRefId,
  evalRefNombre,
  evalRefTipo,
  evalRefFecha,
  evalRefPeriodoId,
  evalRefDimensionIds,
  periodos,
  dimensiones,
}: Props) {
  return (
    <EditarEvalRefSheet
      evalRefId={evalRefId}
      initialNombre={evalRefNombre}
      initialTipo={evalRefTipo}
      initialFecha={evalRefFecha}
      initialPeriodoId={evalRefPeriodoId}
      initialDimensionIds={evalRefDimensionIds}
      periodos={periodos}
      dimensiones={dimensiones}
    />
  )
}
