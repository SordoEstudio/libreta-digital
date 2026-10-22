import { redirect } from 'next/navigation'

type Params = { params: Promise<{ slug: string }> }

export default async function UsuariosRedirect({ params }: Params) {
  const { slug } = await params
  redirect(`/dashboard/${slug}/personal`)
}
