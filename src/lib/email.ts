import { Resend } from 'resend'
import { createElement } from 'react'
import { NotaNuevaEmail, type NotaNuevaEmailProps } from '@/emails/nota-nueva'
import { BienvenidaEmail, type BienvenidaEmailProps } from '@/emails/bienvenida'
import { CierrePeriodoEmail, type CierrePeriodoEmailProps } from '@/emails/cierre-periodo'
import { ComunicadoEmail, type ComunicadoEmailProps } from '@/emails/comunicado'

export type { ComunicadoEmailProps }

const FROM_ADDRESS = process.env.EMAIL_FROM ?? 'Libreta Digital <notificaciones@libretadigital.app>'

function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY not set')
  return new Resend(key)
}

export async function sendNotaNueva(to: string, props: NotaNuevaEmailProps, notaId: string) {
  const resend = getResend()
  const { error } = await resend.emails.send(
    {
      from: FROM_ADDRESS,
      to: [to],
      subject: `Nueva nota para ${props.alumno_nombre} en ${props.materia_nombre}`,
      react: createElement(NotaNuevaEmail, props),
    },
    { idempotencyKey: `nota-nueva/${notaId}/${to}` }
  )
  if (error) console.error('[email] sendNotaNueva failed:', error.message)
  return !error
}

export async function sendBienvenida(to: string, props: BienvenidaEmailProps) {
  const resend = getResend()
  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: [to],
    subject: `Bienvenido a ${props.institucion_nombre} — Libreta Digital`,
    react: createElement(BienvenidaEmail, props),
  })
  if (error) console.error('[email] sendBienvenida failed:', error.message)
  return !error
}

export async function sendCierrePeriodo(to: string, props: CierrePeriodoEmailProps) {
  const resend = getResend()
  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: [to],
    subject: `Libreta de ${props.alumno_nombre} — ${props.periodo_nombre} cerrado`,
    react: createElement(CierrePeriodoEmail, props),
  })
  if (error) console.error('[email] sendCierrePeriodo failed:', error.message)
  return !error
}

export async function sendComunicado(to: string, props: ComunicadoEmailProps, confId: string) {
  const resend = getResend()
  const { error } = await resend.emails.send(
    {
      from: FROM_ADDRESS,
      to: [to],
      subject: `${props.titulo} — ${props.institucion_nombre}`,
      react: createElement(ComunicadoEmail, props),
    },
    { idempotencyKey: `comunicado-confirm/${confId}/${to}` }
  )
  if (error) console.error('[email] sendComunicado failed:', error.message)
  return !error
}
