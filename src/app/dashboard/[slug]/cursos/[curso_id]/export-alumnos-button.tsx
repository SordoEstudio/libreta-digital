'use client'

import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import * as XLSX from 'xlsx'

interface Alumno {
  id: string
  nombre: string
  activo: boolean
}

interface Props {
  alumnos: Alumno[]
  cursoNombre: string
}

export default function ExportAlumnosButton({ alumnos, cursoNombre }: Props) {
  function handleExport() {
    const rows = alumnos.map(a => ({
      Nombre: a.nombre,
      Estado: a.activo ? 'Activo' : 'Inactivo',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Alumnos')
    XLSX.writeFile(wb, `Alumnos - ${cursoNombre}.xlsx`)
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport}>
      <Download data-icon="inline-start" />
      Exportar Excel
    </Button>
  )
}
