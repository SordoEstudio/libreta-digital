import {
  Html, Head, Preview, Body, Container, Section,
  Heading, Text, Button, Hr, Tailwind, pixelBasedPreset,
} from 'react-email'

export interface BienvenidaEmailProps {
  nombre: string
  email: string
  institucion_nombre: string
  rol: string
  login_url: string
  setup_url?: string
}

const ROL_LABELS: Record<string, string> = {
  admin: 'Administrador',
  docente: 'Docente',
  responsable: 'Responsable',
}

export function BienvenidaEmail({
  nombre,
  email,
  institucion_nombre,
  rol,
  login_url,
  setup_url,
}: BienvenidaEmailProps) {
  const rolLabel = ROL_LABELS[rol] ?? rol

  return (
    <Html lang="es">
      <Tailwind config={{ presets: [pixelBasedPreset] }}>
        <Head />
        <Body className="bg-gray-50 font-sans">
          <Preview>Bienvenido a Libreta Digital — {institucion_nombre}</Preview>
          <Container className="max-w-600 mx-auto py-24">
            <Section className="bg-white rounded-8 p-32 border-solid border border-gray-200">
              <Heading as="h1" className="text-20 font-semibold text-gray-900 m-0 mb-4">
                Bienvenido a Libreta Digital
              </Heading>
              <Text className="text-14 text-gray-500 m-0 mb-24">
                {institucion_nombre}
              </Text>

              <Text className="text-15 text-gray-700 m-0 mb-16">
                Hola {nombre},
              </Text>
              <Text className="text-15 text-gray-700 m-0 mb-24">
                Fuiste invitado a <strong>{institucion_nombre}</strong> como{' '}
                <strong>{rolLabel}</strong>. Podés acceder con tu email{' '}
                <strong>{email}</strong>.
              </Text>

              {setup_url ? (
                <>
                  <Text className="text-15 text-gray-700 m-0 mb-16">
                    Como primer paso, creá tu contraseña haciendo clic en el botón:
                  </Text>
                  <Button
                    href={setup_url}
                    className="bg-gray-900 text-white px-24 py-12 rounded-8 block text-center no-underline box-border text-14 font-medium"
                  >
                    Crear contraseña
                  </Button>
                </>
              ) : (
                <Button
                  href={login_url}
                  className="bg-gray-900 text-white px-24 py-12 rounded-8 block text-center no-underline box-border text-14 font-medium"
                >
                  Ingresar a la plataforma
                </Button>
              )}

              <Hr className="border-none border-t border-solid border-gray-200 my-24" />
              <Text className="text-12 text-gray-400 m-0">
                Si no esperabas esta invitación podés ignorar este mensaje.
                Libreta Digital — Harvi Digital.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}

BienvenidaEmail.PreviewProps = {
  nombre: 'Carlos López',
  email: 'carlos@ejemplo.com',
  institucion_nombre: 'Academia Demo',
  rol: 'docente',
  login_url: 'https://libretadigital.app/login',
} satisfies BienvenidaEmailProps

export default BienvenidaEmail
