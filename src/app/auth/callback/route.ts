import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const redirect = searchParams.get('redirect') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return NextResponse.redirect(`${origin}/auth/error`)

      const sinInstitucion = user?.app_metadata?.sin_institucion

      // Custom Access Token Hook active (Team plan) — trust metadata directly
      if (sinInstitucion !== undefined) {
        if (sinInstitucion) return NextResponse.redirect(`${origin}/sin-institucion`)
        return NextResponse.redirect(`${origin}${redirect}`)
      }

      // Free plan: no JWT hook — link Google/OAuth auth_id to existing persona by email
      if (user.email) {
        const admin = createAdminClient()
        const { data: persona } = await admin
          .from('personas')
          .select('id, auth_id')
          .eq('email', user.email)
          .is('deleted_at', null)
          .maybeSingle()

        if (!persona) return NextResponse.redirect(`${origin}/sin-institucion`)

        if (persona.auth_id !== user.id) {
          await admin.from('personas').update({ auth_id: user.id }).eq('id', persona.id)
        }
      }

      return NextResponse.redirect(`${origin}${redirect}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/error`)
}
