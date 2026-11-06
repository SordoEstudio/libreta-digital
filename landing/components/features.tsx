const FEATURES = [
  {
    icon: '🎯',
    title: 'Niveles y cursos',
    description:
      'A1, A2, B1, B2, C1, C2 — o como los llames vos. Organizá por nivel con un clic.',
  },
  {
    icon: '📊',
    title: 'Notas por habilidad',
    description:
      'Reading, Writing, Listening, Speaking — cada habilidad con su nota y peso independiente.',
  },
  {
    icon: '📣',
    title: 'Comunicados digitales',
    description:
      'Avisos a padres con confirmación de lectura. Sin grupos de WhatsApp.',
  },
  {
    icon: '📄',
    title: 'Boletín digital',
    description:
      'PDF de calificaciones listo para enviar al cierre de cada cuatrimestre.',
  },
  {
    icon: '🔒',
    title: 'Cierre de períodos',
    description:
      'Bloqueá ediciones al cerrar el cuatrimestre. Las notas quedan protegidas.',
  },
  {
    icon: '📓',
    title: 'Cuaderno del docente',
    description:
      'Seguimiento clase a clase, por nivel. Todo en el mismo lugar.',
  },
]

export default function Features() {
  return (
    <section className="bg-harvi-grey py-20">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="mb-12 text-center text-2xl font-bold text-harvi-dark md:text-3xl">
          Todo lo que necesita tu academia
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div
              key={i}
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <span className="text-3xl">{f.icon}</span>
              <h3 className="mt-3 text-base font-bold text-harvi-dark">{f.title}</h3>
              <p className="mt-2 text-sm text-gray-600">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
