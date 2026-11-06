const WA_URL = 'https://wa.me/543492635571'

export default function Nav() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <span className="text-xl font-bold text-harvi-dark">Libreta Digital</span>
        <a
          href={WA_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-harvi-green-lime px-5 py-2 text-sm font-semibold text-harvi-dark transition-opacity hover:opacity-90"
        >
          Solicitar demo
        </a>
      </div>
    </nav>
  )
}
