import {
  Html, Head, Preview, Body, Container, Section,
  Heading, Text, Hr, Img, Tailwind, pixelBasedPreset,
} from 'react-email'

export interface NotaNuevaEmailProps {
  alumno_nombre: string
  materia_nombre: string
  curso_nombre: string
  evaluacion_nombre: string
  evaluacion_tipo: string
  valor: string
  institucion_nombre: string
  responsable_nombre: string
  logo_url?: string
}

export function NotaNuevaEmail({
  alumno_nombre,
  materia_nombre,
  curso_nombre,
  evaluacion_nombre,
  evaluacion_tipo,
  valor,
  institucion_nombre,
  responsable_nombre,
  logo_url,
}: NotaNuevaEmailProps) {
  return (
    <Html lang="es">
      <Tailwind config={{ presets: [pixelBasedPreset] }}>
        <Head />
        <Body className="bg-gray-50 font-sans">
          <Preview>Nueva nota para {alumno_nombre} en {materia_nombre}</Preview>
          <Container className="max-w-600 mx-auto py-24">
            <Section className="bg-white rounded-8 p-32 border-solid border border-gray-200">
              {logo_url ? (
                <Img src={logo_url} alt={institucion_nombre} height={40} className="mb-16 object-contain" />
              ) : (
                <Heading as="h1" className="text-20 font-semibold text-gray-900 m-0 mb-4">
                  Nueva nota disponible
                </Heading>
              )}
              <Text className="text-14 text-gray-500 m-0 mb-24">
                {institucion_nombre}
              </Text>

              <Text className="text-15 text-gray-700 m-0 mb-16">
                Hola {responsable_nombre},
              </Text>
              <Text className="text-15 text-gray-700 m-0 mb-24">
                Se registró una nueva nota para <strong>{alumno_nombre}</strong>:
              </Text>

              <Section className="bg-gray-50 rounded-8 p-24 border-solid border border-gray-100 mb-24">
                <table width="100%" style={{ borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td className="text-14 text-gray-500 pb-8" width="40%">Materia</td>
                      <td className="text-14 text-gray-800 font-medium pb-8">{materia_nombre}</td>
                    </tr>
                    <tr>
                      <td className="text-14 text-gray-500 pb-8">Curso</td>
                      <td className="text-14 text-gray-800 font-medium pb-8">{curso_nombre}</td>
                    </tr>
                    <tr>
                      <td className="text-14 text-gray-500 pb-8">Evaluación</td>
                      <td className="text-14 text-gray-800 font-medium pb-8">{evaluacion_nombre}</td>
                    </tr>
                    <tr>
                      <td className="text-14 text-gray-500 pb-8">Tipo</td>
                      <td className="text-14 text-gray-800 font-medium pb-8">{evaluacion_tipo}</td>
                    </tr>
                    <tr>
                      <td className="text-14 text-gray-500">Nota</td>
                      <td className="text-20 text-gray-900 font-bold">{valor}</td>
                    </tr>
                  </tbody>
                </table>
              </Section>

              <Hr className="border-none border-t border-solid border-gray-200 my-24" />
              <Text className="text-12 text-gray-400 m-0">
                Este mensaje fue enviado por Libreta Digital — Harvi Digital.
                Podés ver más detalles en la plataforma.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}

NotaNuevaEmail.PreviewProps = {
  alumno_nombre: 'Juan García',
  materia_nombre: 'Matemáticas',
  curso_nombre: '3° A',
  evaluacion_nombre: 'Primer Parcial',
  evaluacion_tipo: 'parcial',
  valor: '8.5',
  institucion_nombre: 'Academia Demo',
  responsable_nombre: 'María García',
} satisfies NotaNuevaEmailProps

export default NotaNuevaEmail
