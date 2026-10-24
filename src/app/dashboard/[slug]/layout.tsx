import { createClient } from '@/lib/supabase/server'
import { InstitucionConfigProvider } from '@/lib/institucion-config'

type Props = {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}

export default async function SlugLayout({ children, params }: Props) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: inst } = await supabase
    .from('instituciones')
    .select('termino_recuperatorio')
    .eq('slug', slug)
    .is('deleted_at', null)
    .single()

  return (
    <InstitucionConfigProvider
      config={{ terminoRecuperatorio: inst?.termino_recuperatorio ?? 'Recuperatorio' }}
    >
      {children}
    </InstitucionConfigProvider>
  )
}
