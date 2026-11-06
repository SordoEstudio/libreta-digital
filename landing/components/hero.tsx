const WA_URL = 'https://wa.me/543492635571'

export default function Hero() {
  return (
    <section className="bg-harvi-dark">
      <div className="mx-auto max-w-4xl px-6 py-24 text-center md:py-36">
        <h1 className="text-4xl font-bold leading-tight text-white md:text-6xl">
          El cuaderno digital para tu academia de idiomas
        </h1>
        <p className="mt-6 text-lg text-harvi-blue-light md:text-xl">
          Gestioná niveles, calificaciones por habilidad y comunicación con padres
          — todo en un solo lugar.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            href={WA_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full rounded-xl bg-harvi-green-lime px-8 py-4 text-base font-semibold text-harvi-dark transition-opacity hover:opacity-90 sm:w-auto"
          >
            Solicitar demo
          </a>
          <a
            href="#video"
            className="w-full rounded-xl border border-harvi-green-lime px-8 py-4 text-base font-semibold text-harvi-green-lime transition-opacity hover:opacity-80 sm:w-auto"
          >
            Ver video
          </a>
        </div>
      </div>
    </section>
  )
}
