'use client'

interface Props {
  directorNombre: string | null
  directorCargo:  string | null
  instNombre:     string
}

export default function FirmasSection({ directorNombre, directorCargo, instNombre }: Props) {
  const cargo = directorCargo || 'Director/a'
  const fecha = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  return (
    <div className="hidden print:block mt-8 pt-4 border-t border-gray-300">
      <div className="flex justify-between items-end gap-8">
        <div>
          <p className="text-xs text-gray-500">Documento emitido digitalmente</p>
          <p className="text-xs text-gray-500">{instNombre} · {fecha}</p>
        </div>
        {directorNombre && (
          <div className="text-right">
            <p className="text-sm font-medium text-gray-800">{directorNombre}</p>
            <p className="text-xs text-gray-500">{cargo}</p>
          </div>
        )}
      </div>
    </div>
  )
}
