import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const PUBLIC_ROUTES = [
  '/login',
  '/forgot-password',
  '/update-password',
  '/auth/callback',
  '/auth/error',
  '/api/health',
]

const SUPERADMIN_ROUTES = ['/superadmin']

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  const { supabaseResponse, user } = await updateSession(request)

  if (!user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const metadata = user.app_metadata
  const memberships: Array<{ institucion_id: string; rol: string }> =
    metadata?.memberships ?? []

  if (metadata?.sin_institucion && !pathname.startsWith('/sin-institucion')) {
    return NextResponse.redirect(new URL('/sin-institucion', request.url))
  }

  if (SUPERADMIN_ROUTES.some(route => pathname.startsWith(route))) {
    const isSuperadmin = memberships.some(m => m.rol === 'superadmin')
    if (!isSuperadmin) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
