'use client'

type DocenteMateria = { nombre: string; apellido: string | null; materias: string[] }

interface Props {
  directorNombre: string | null
  directorCargo:  string | null
  instNombre:     string
  docentes:       DocenteMateria[]
}

export default function FirmasSection({ directorNombre, directorCargo, instNombre, docentes }: Props) {
  const cargo = directorCargo || 'Director/a'
  const fecha = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  return (
    <div className="hidden print:block mt-8 pt-4 border-t border-gray-300">
      <div className="flex justify-between items-start gap-8">

        {/* Docentes */}
        {docentes.length > 0 && (
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Docentes a cargo</p>
            <ul className="space-y-0.5">
              {docentes.map((d, i) => {
                const nombre = d.apellido ? `${d.apellido}, ${d.nombre}` : d.nombre
                return (
                  <li key={i} className="text-xs text-gray-700">
                    <span className="font-medium">{nombre}</span>
                    {d.materias.length > 0 && (
                      <span className="text-gray-500"> — {d.materias.join(', ')}</span>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {/* Director */}
        {directorNombre && (
          <div className="text-right shrink-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">{cargo}</p>
            <p className="text-sm font-medium text-gray-800">{directorNombre}</p>
            <p className="text-xs text-gray-500">{instNombre}</p>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-3">
        Documento emitido digitalmente · {instNombre} · {fecha}
      </p>
    </div>
  )
}
