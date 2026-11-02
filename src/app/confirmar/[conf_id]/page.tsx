import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

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
    .select('id, confirmed_at, comunicados(titulo, contenido, instituciones(nombre, slug))')
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
  const contenido = (comunicado as { contenido?: string } | null)?.contenido ?? null
  const instRaw = comunicado && 'instituciones' in comunicado ? comunicado.instituciones : null
  const instData = Array.isArray(instRaw) ? instRaw[0] : instRaw
  const institucion = (instData as { nombre?: string } | null)?.nombre
  const slug = (instData as { slug?: string } | null)?.slug
  const backHref = slug ? `/dashboard/${slug}` : '/dashboard'

  if (conf.confirmed_at) {
    return (
      <ConfirmarLayout titulo={titulo} institucion={institucion}>
        <p className="text-gray-700 mb-6">Ya confirmaste la lectura de este comunicado. ¡Gracias!</p>
        <Button variant="outline" render={<Link href={backHref} />}>
          Ir al inicio
        </Button>
      </ConfirmarLayout>
    )
  }

  async function handleConfirmar() {
    'use server'
    const adminClient = createAdminClient()
    await adminClient
      .from('comunicado_confirmaciones')
      .update({ confirmed_at: new Date().toISOString() })
      .eq('id', conf_id)
    redirect(`/confirmar/${conf_id}`)
  }

  return (
    <ConfirmarLayout titulo={titulo} institucion={institucion}>
      {contenido && (
        <div className="mb-6 rounded-md bg-gray-50 border border-gray-200 p-4">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{contenido}</p>
        </div>
      )}
      <form action={handleConfirmar} className="flex flex-col gap-3">
        <Button type="submit" className="w-full">
          Confirmar lectura
        </Button>
        <Button variant="outline" render={<Link href={backHref} />}>
          Volver sin confirmar
        </Button>
      </form>
    </ConfirmarLayout>
  )
}
