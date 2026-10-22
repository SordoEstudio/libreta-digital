import { redirect } from 'next/navigation'
import { requireSession } from '@/lib/auth'

type Params = { params: Promise<{ slug: string }> }

export default async function UsuariosRedirect({ params }: Params) {
  await requireSession()
  const { slug } = await params
  redirect(`/dashboard/${slug}/personal`)
}
