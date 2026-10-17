import EditarEvalRefSheet from '@/components/eval-ref/editar-eval-ref-sheet'

interface EvalRefMeta {
  id: string
  nombre: string
  tipo: 'numerica' | 'conceptual'
  periodoId: string | null
  dimensionIds: string[]
  unidadIds: string[]
}

interface Periodo { id: string; nombre: string; orden: number }
interface Dimension { id: string; nombre: string; orden: number }
interface Unidad { id: string; nombre: string }

interface Props {
  evalRef: EvalRefMeta
  periodos: Periodo[]
  dimensiones: Dimension[]
  unidades: Unidad[]
}

export default function CuadernoAccionesCol({ evalRef, periodos, dimensiones, unidades }: Props) {
  return (
    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
      <EditarEvalRefSheet
        evalRefId={evalRef.id}
        initialNombre={evalRef.nombre}
        initialTipo={evalRef.tipo}
        initialFecha={null}
        initialPeriodoId={evalRef.periodoId}
        initialDimensionIds={evalRef.dimensionIds}
        initialUnidadIds={evalRef.unidadIds}
        periodos={periodos}
        dimensiones={dimensiones}
        unidades={unidades}
      />
    </div>
  )
}
