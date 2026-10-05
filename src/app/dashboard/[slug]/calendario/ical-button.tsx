'use client'

import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import type { HorarioEvento } from '@/lib/horario-conflicts'

const BYDAY = ['', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']

function pad(n: number) { return String(n).padStart(2, '0') }

function nextWeekdayDate(dia: number): Date {
  const today = new Date()
  const todayDow = today.getDay() || 7
  const diff = (dia - todayDow + 7) % 7
  const d = new Date(today)
  d.setDate(today.getDate() + diff)
  return d
}

function formatDT(date: Date, time: string): string {
  const parts = time.split(':')
  const h = parseInt(parts[0])
  const m = parseInt(parts[1])
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(h)}${pad(m)}00`
}

function generateIcal(horarios: HorarioEvento[], instNombre: string): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Harvi Digital//Libreta Digital//ES',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${instNombre}`,
    'X-WR-TIMEZONE:America/Argentina/Buenos_Aires',
  ]

  for (const h of horarios) {
    const nextDate = nextWeekdayDate(h.dia_semana)
    const summary = h.cursoNombre
      ? `${h.materiaNombre} (${h.cursoNombre})`
      : h.materiaNombre
    lines.push(
      'BEGIN:VEVENT',
      `UID:horario-${h.id}@libreta.digital`,
      `DTSTART;TZID=America/Argentina/Buenos_Aires:${formatDT(nextDate, h.hora_inicio)}`,
      `DTEND;TZID=America/Argentina/Buenos_Aires:${formatDT(nextDate, h.hora_fin)}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${BYDAY[h.dia_semana]}`,
      `SUMMARY:${summary}`,
      ...(h.aula ? [`LOCATION:${h.aula}`] : []),
      'END:VEVENT',
    )
  }

  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

interface Props {
  horarios: HorarioEvento[]
  instNombre: string
}

export default function IcalButton({ horarios, instNombre }: Props) {
  function handleDownload() {
    const ical = generateIcal(horarios, instNombre)
    const blob = new Blob([ical], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `horario-${instNombre.toLowerCase().replace(/\s+/g, '-')}.ics`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Button variant="outline" size="sm" onClick={handleDownload}>
      <Download className="size-3.5 mr-1.5" />
      Exportar calendario
    </Button>
  )
}
