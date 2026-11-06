export default function Footer() {
  return (
    <footer className="bg-harvi-dark py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-harvi-blue-light/70 sm:flex-row">
        <span>Libreta Digital by Harvi · 2026</span>
        <a
          href="https://app.harvi.com"
          className="transition-colors hover:text-harvi-blue-light"
        >
          Iniciar sesión
        </a>
      </div>
    </footer>
  )
}
