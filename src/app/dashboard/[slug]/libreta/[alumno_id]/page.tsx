import { redirect } from 'next/navigation'

type Params = { params: Promise<{ slug: string; alumno_id: string }> }

export default async function LibretaPage({ params }: Params) {
  const { slug, alumno_id } = await params
  redirect(`/dashboard/${slug}/libreta/${alumno_id}/boletin`)
}
