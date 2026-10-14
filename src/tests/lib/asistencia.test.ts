import { describe, it, expect } from 'vitest'
import { calcularPorcentajeAsistencia } from '@/lib/asistencia'

describe('calcularPorcentajeAsistencia', () => {
  it('retorna null cuando total_clases es 0 (evita división por cero)', () => {
    expect(calcularPorcentajeAsistencia(0, 0, 0)).toBeNull()
  })

  it('calcula porcentaje de asistencia correctamente', () => {
    // 20 clases, 2 justif + 3 injustif = 5 ausencias, 15 presentes = 75%
    expect(calcularPorcentajeAsistencia(20, 2, 3)).toBe(75)
  })

  it('retorna 100 cuando no hay inasistencias', () => {
    expect(calcularPorcentajeAsistencia(10, 0, 0)).toBe(100)
  })

  it('redondea a un decimal', () => {
    // 30 clases, 1 + 0 = 1 ausencia → 29/30 = 96.666...% → 96.7
    expect(calcularPorcentajeAsistencia(30, 1, 0)).toBe(96.7)
  })
})
