import { describe, it, expect } from 'vitest'
import { deduplicarResponsables, CreateComunicadoSchema } from '@/lib/comunicados'

const UUID_A = '550e8400-e29b-41d4-a716-446655440001'
const UUID_B = '550e8400-e29b-41d4-a716-446655440002'

describe('deduplicarResponsables', () => {
  it('retorna vacío para array vacío', () => {
    expect(deduplicarResponsables([])).toEqual([])
  })
  it('no modifica array sin duplicados', () => {
    const input = [
      { persona_id: UUID_A, email: 'a@test.com' },
      { persona_id: UUID_B, email: 'b@test.com' },
    ]
    expect(deduplicarResponsables(input)).toEqual(input)
  })
  it('deduplica manteniendo primera aparición', () => {
    const input = [
      { persona_id: UUID_A, email: 'first@test.com' },
      { persona_id: UUID_A, email: 'second@test.com' },
    ]
    expect(deduplicarResponsables(input)).toEqual([{ persona_id: UUID_A, email: 'first@test.com' }])
  })
  it('maneja múltiples persona_ids con duplicados mezclados', () => {
    const input = [
      { persona_id: UUID_A, email: 'a1@test.com' },
      { persona_id: UUID_B, email: 'b@test.com' },
      { persona_id: UUID_A, email: 'a2@test.com' },
    ]
    const result = deduplicarResponsables(input)
    expect(result).toHaveLength(2)
    expect(result[0].email).toBe('a1@test.com')
    expect(result[1].persona_id).toBe(UUID_B)
  })
})

describe('CreateComunicadoSchema', () => {
  it('rechaza titulo vacío', () => {
    const r = CreateComunicadoSchema.safeParse({ titulo: '', contenido: 'x', curso_id: UUID_A })
    expect(r.success).toBe(false)
  })
  it('rechaza titulo > 300 chars', () => {
    const r = CreateComunicadoSchema.safeParse({ titulo: 'x'.repeat(301), contenido: 'x', curso_id: UUID_A })
    expect(r.success).toBe(false)
  })
  it('rechaza curso_id no uuid', () => {
    const r = CreateComunicadoSchema.safeParse({ titulo: 'T', contenido: 'C', curso_id: 'not-a-uuid' })
    expect(r.success).toBe(false)
  })
  it('acepta datos válidos', () => {
    const r = CreateComunicadoSchema.safeParse({ titulo: 'Reunión', contenido: 'Se informa...', curso_id: UUID_A })
    expect(r.success).toBe(true)
  })
})
