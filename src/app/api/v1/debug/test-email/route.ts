import { getSession, isSuperadmin } from '@/lib/auth'
import { Err } from '@/lib/api'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST() {
  const session = await getSession()
  if (!session || !isSuperadmin(session)) return Err.forbidden()

  const key = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM ?? '(no seteado)'

  if (!key) {
    return NextResponse.json({ ok: false, error: 'RESEND_API_KEY no está seteada en el entorno' })
  }

  const resend = new Resend(key)

  const { data, error } = await resend.emails.send({
    from,
    to: [session.email],
    subject: 'Test email — Libreta Digital',
    html: '<p>Email de prueba desde el servidor. Si llegó, Resend está funcionando.</p>',
  })

  if (error) {
    return NextResponse.json({
      ok: false,
      key_prefix: key.slice(0, 6) + '...',
      from,
      error: error.message,
      error_name: error.name,
    })
  }

  return NextResponse.json({
    ok: true,
    key_prefix: key.slice(0, 6) + '...',
    from,
    resend_id: data?.id,
    sent_to: session.email,
  })
}
