import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import './globals.css'

export const metadata: Metadata = {
  title: 'Libreta Digital — Plataforma para academias de idiomas',
  description:
    'Gestioná niveles, calificaciones por habilidad y comunicación con padres — todo en un solo lugar.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={GeistSans.className}>
      <body className="antialiased">{children}</body>
    </html>
  )
}
