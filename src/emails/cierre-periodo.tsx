import {
  Html, Head, Preview, Body, Container, Section,
  Heading, Text, Button, Hr, Tailwind, pixelBasedPreset,
} from 'react-email'

export interface CierrePeriodoEmailProps {
  alumno_nombre: string
  periodo_nombre: string
  institucion_nombre: string
  boletin_url: string
}

export function CierrePeriodoEmail({
  alumno_nombre,
  periodo_nombre,
  institucion_nombre,
  boletin_url,
}: CierrePeriodoEmailProps) {
  return (
    <Html lang="es">
      <Tailwind config={{ presets: [pixelBasedPreset] }}>
        <Head />
        <Body className="bg-gray-50 font-sans">
          <Preview>Libreta de {alumno_nombre} — {periodo_nombre}</Preview>
          <Container className="max-w-600 mx-auto py-24">
            <Section className="bg-white rounded-8 p-32 border-solid border border-gray-200">
              <Heading as="h1" className="text-20 font-semibold text-gray-900 m-0 mb-4">
                Libreta Digital
              </Heading>
              <Text className="text-14 text-gray-500 m-0 mb-24">
                {institucion_nombre}
              </Text>

              <Text className="text-15 text-gray-700 m-0 mb-16">
                El período <strong>{periodo_nombre}</strong> fue cerrado.
              </Text>
              <Text className="text-15 text-gray-700 m-0 mb-24">
                Ya podés ver la libreta digital de <strong>{alumno_nombre}</strong> en el sitio.
              </Text>

              <Button
                href={boletin_url}
                className="bg-gray-900 text-white px-24 py-12 rounded-8 block text-center no-underline box-border text-14 font-medium"
              >
                Ver libreta digital
              </Button>

              <Hr className="border-none border-t border-solid border-gray-200 my-24" />
              <Text className="text-12 text-gray-400 m-0">
                Libreta Digital — Harvi Digital.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}

CierrePeriodoEmail.PreviewProps = {
  alumno_nombre: 'Lucía García',
  periodo_nombre: 'Trimestre 1',
  institucion_nombre: 'Academia Demo',
  boletin_url: 'https://libretadigital.app/dashboard/academia-demo/libreta/abc123/boletin',
} satisfies CierrePeriodoEmailProps

export default CierrePeriodoEmail
