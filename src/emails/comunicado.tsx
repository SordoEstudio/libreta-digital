import {
  Html, Head, Preview, Body, Container, Section,
  Heading, Text, Button, Hr, Img, Tailwind, pixelBasedPreset,
} from 'react-email'

export interface ComunicadoEmailProps {
  titulo: string
  contenido: string
  institucion_nombre: string
  confirm_url: string
  logo_url?: string
}

export function ComunicadoEmail({
  titulo,
  contenido,
  institucion_nombre,
  confirm_url,
  logo_url,
}: ComunicadoEmailProps) {
  return (
    <Html lang="es">
      <Tailwind config={{ presets: [pixelBasedPreset] }}>
        <Head />
        <Body className="bg-gray-50 font-sans">
          <Preview>{titulo} — {institucion_nombre}</Preview>
          <Container className="max-w-600 mx-auto py-24">
            <Section className="bg-white rounded-8 p-32 border-solid border border-gray-200">
              {logo_url ? (
                <Img src={logo_url} alt={institucion_nombre} height={40} className="mb-16 object-contain" />
              ) : (
                <Heading as="h1" className="text-20 font-semibold text-gray-900 m-0 mb-4">
                  Libreta Digital
                </Heading>
              )}
              <Text className="text-14 text-gray-500 m-0 mb-24">
                {institucion_nombre}
              </Text>

              <Heading as="h2" className="text-17 font-semibold text-gray-900 m-0 mb-16">
                {titulo}
              </Heading>

              <Text
                className="text-15 text-gray-700 m-0 mb-24"
                style={{ whiteSpace: 'pre-wrap' }}
              >
                {contenido}
              </Text>

              <Button
                href={confirm_url}
                className="bg-gray-900 text-white px-24 py-12 rounded-8 block text-center no-underline box-border text-14 font-medium"
              >
                Confirmar lectura
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

ComunicadoEmail.PreviewProps = {
  titulo: 'Reunión de padres — Trimestre 2',
  contenido: 'Se informa a los responsables que la reunión de padres se realizará el próximo viernes 20 de octubre a las 18:00 hs en el aula magna.\n\nSe solicita confirmación de asistencia.',
  institucion_nombre: 'Academia Demo',
  confirm_url: 'https://libretadigital.app/confirmar/550e8400-e29b-41d4-a716-446655440001',
} satisfies ComunicadoEmailProps

export default ComunicadoEmail
