import { requireSession, isSuperadmin, hasRole, hasAnyRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { readFileSync } from 'fs'
import { join } from 'path'
import ManualViewer from './manual-viewer'

type Params = { params: Promise<{ slug: string }> }

function readManual(filename: string): string {
  try {
    return readFileSync(join(process.cwd(), 'docs', 'manuales', filename), 'utf-8')
  } catch {
    return ''
  }
}

export default async function AyudaPage({ params }: Params) {
  const { slug } = await params
  const session = await requireSession()

  const supabase = await createClient()
  const { data: inst } = await supabase
    .from('instituciones')
    .select('id')
    .eq('slug', slug)
    .is('deleted_at', null)
    .single()

  if (!inst) {
    if (isSuperadmin(session)) redirect('/dashboard/instituciones')
    notFound()
  }

  if (!isSuperadmin(session) && !hasAnyRole(session, inst.id, ['admin', 'docente', 'responsable']))
    redirect(`/dashboard/${slug}`)

  const isAdmin = isSuperadmin(session) || hasRole(session, inst.id, 'admin')
  const isDocente = !isAdmin && hasRole(session, inst.id, 'docente')

  const filename = isAdmin ? 'admin.md' : isDocente ? 'docente.md' : 'responsable.md'
  const content = readManual(filename)

  return <ManualViewer content={content} />
}
