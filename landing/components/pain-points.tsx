const PAIN_POINTS = [
  {
    icon: '📋',
    text: 'Las libretas de papel se pierden. Un error y hay que rehacer todo desde cero.',
  },
  {
    icon: '⏱️',
    text: 'Cada cuatrimestre, el mismo trabajo manual: armar planillas, copiar datos, perder horas.',
  },
  {
    icon: '📱',
    text: 'El celular del docente, el grupo de padres, los avisos sueltos. Todo mezclado, nada organizado.',
  },
  {
    icon: '🔄',
    text: 'Los mismos alumnos, las mismas materias, los mismos formularios. Cada año, de nuevo.',
  },
]

export default function PainPoints() {
  return (
    <section className="bg-harvi-grey py-20">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="mb-12 text-center text-2xl font-bold text-harvi-dark md:text-3xl">
          ¿Te suena familiar?
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {PAIN_POINTS.map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <span className="text-2xl">{item.icon}</span>
              <p className="text-gray-700">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
