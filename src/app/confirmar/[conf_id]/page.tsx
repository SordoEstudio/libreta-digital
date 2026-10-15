import { createAdminClient } from '@/lib/supabase/admin'

type Params = { params: Promise<{ conf_id: string }> }

function ConfirmarLayout({ children, titulo, institucion }: { children: React.ReactNode; titulo?: string; institucion?: string }) {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-gray-200 p-8 max-w-md w-full">
        <p className="text-sm text-gray-500 mb-1">Libreta Digital</p>
        {institucion && <p className="text-sm font-medium text-gray-700 mb-4">{institucion}</p>}
        {titulo && <h1 className="text-lg font-semibold text-gray-900 mb-4">{titulo}</h1>}
        {children}
      </div>
    </main>
  )
}

export default async function ConfirmarPage({ params }: Params) {
  const { conf_id } = await params
  const supabase = createAdminClient()

  const { data: conf } = await supabase
    .from('comunicado_confirmaciones')
    .select('id, confirmed_at, comunicados(titulo, instituciones(nombre))')
    .eq('id', conf_id)
    .single()

  if (!conf) {
    return (
      <ConfirmarLayout>
        <p className="text-gray-700">El enlace no es válido o ya expiró.</p>
      </ConfirmarLayout>
    )
  }

  const comunicado = Array.isArray(conf.comunicados) ? conf.comunicados[0] : conf.comunicados
  const titulo = comunicado?.titulo
  const instRaw = comunicado && 'instituciones' in comunicado ? comunicado.instituciones : null
  const institucion = Array.isArray(instRaw) ? instRaw[0]?.nombre : instRaw?.nombre

  if (conf.confirmed_at) {
    return (
      <ConfirmarLayout titulo={titulo} institucion={institucion}>
        <p className="text-gray-700">Ya confirmaste la lectura de este comunicado. ¡Gracias!</p>
      </ConfirmarLayout>
    )
  }

  await supabase
    .from('comunicado_confirmaciones')
    .update({ confirmed_at: new Date().toISOString() })
    .eq('id', conf_id)

  return (
    <ConfirmarLayout titulo={titulo} institucion={institucion}>
      <p className="text-gray-700">Gracias por confirmar la lectura.</p>
    </ConfirmarLayout>
  )
}
