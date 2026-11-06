const VALUES = [
  {
    headline: 'Todo en un solo lugar',
    body: 'Ante la duda, sabés dónde ir a buscar. Todo lo académico centralizado.',
  },
  {
    headline: 'Configurás una vez',
    body: 'La configuración se hace una vez. No cada ciclo, no cada año.',
  },
  {
    headline: 'Historial completo del alumno',
    body: 'Desde el primer día en la institución hasta hoy, todo registrado.',
  },
  {
    headline: 'Planificación anticipada',
    body: 'Organizá el año antes de que empiece. Sin urgencias de último momento.',
  },
]

export default function ValueProps() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="mb-12 text-center text-2xl font-bold text-harvi-dark md:text-3xl">
          ¿Qué cambia con Libreta Digital?
        </h2>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {VALUES.map((v, i) => (
            <div key={i} className="flex flex-col gap-2">
              <h3 className="text-lg font-bold text-harvi-dark">{v.headline}</h3>
              <p className="text-gray-600">{v.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
