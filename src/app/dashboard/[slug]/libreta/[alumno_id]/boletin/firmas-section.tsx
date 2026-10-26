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
    <div className="hidden print:block mt-8 pt-6 border-t border-gray-300">
      <p className="text-sm text-right mb-10">{fecha}</p>
      <div className="flex justify-between gap-12 mt-4">
        <div className="flex-1">
          <div className="border-t border-gray-800 pt-2">
            <p className="text-sm">Firma del/la Responsable</p>
          </div>
        </div>
        <div className="flex-1">
          <div className="border-t border-gray-800 pt-2">
            <p className="text-sm">Firma del/la {cargo}</p>
            {directorNombre && (
              <p className="text-sm mt-1 font-medium">{directorNombre}</p>
            )}
            <p className="text-xs text-gray-600 mt-0.5">{cargo} · {instNombre}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
