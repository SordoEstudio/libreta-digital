import { describe, it, expect } from 'vitest'
import { calcPromedioReferencia } from '@/lib/notas-referencia'

describe('calcPromedioReferencia', () => {
  it('retorna null si array vacío', () => {
    expect(calcPromedioReferencia([])).toBeNull()
  })

  it('retorna null si todos los valores son null', () => {
    expect(calcPromedioReferencia([{ valor_numerico: null }, { valor_numerico: null }])).toBeNull()
  })

  it('ignora nulls al promediar', () => {
    expect(calcPromedioReferencia([
      { valor_numerico: 8 },
      { valor_numerico: null },
      { valor_numerico: 6 },
    ])).toBe(7)
  })

  it('promedio exacto con 2 decimales', () => {
    expect(calcPromedioReferencia([
      { valor_numerico: 7 },
      { valor_numerico: 8 },
      { valor_numerico: 9 },
    ])).toBe(8)
  })

  it('un solo valor no-null', () => {
    expect(calcPromedioReferencia([{ valor_numerico: 5.5 }])).toBe(5.5)
  })
})
