import { describe, it, expect } from 'vitest'
import { CreatePlantillaSchema, AplicarPlantillaSchema } from '@/lib/dimension-plantillas'

const UUID_A = '550e8400-e29b-41d4-a716-446655440001'

describe('CreatePlantillaSchema', () => {
  it('acepta datos válidos', () => {
    const r = CreatePlantillaSchema.safeParse({
      nombre: 'Oral + Escrito',
      items: [
        { nombre: 'Oral', peso: 30 },
        { nombre: 'Escrito', peso: 70 },
      ],
    })
    expect(r.success).toBe(true)
  })
  it('rechaza nombre vacío', () => {
    const r = CreatePlantillaSchema.safeParse({ nombre: '', items: [{ nombre: 'x', peso: 50 }] })
    expect(r.success).toBe(false)
  })
  it('rechaza nombre > 100 chars', () => {
    const r = CreatePlantillaSchema.safeParse({ nombre: 'x'.repeat(101), items: [{ nombre: 'x', peso: 50 }] })
    expect(r.success).toBe(false)
  })
  it('rechaza items vacíos', () => {
    const r = CreatePlantillaSchema.safeParse({ nombre: 'Plantilla', items: [] })
    expect(r.success).toBe(false)
  })
  it('acepta ítem con peso null (promedio directo)', () => {
    const r = CreatePlantillaSchema.safeParse({ nombre: 'P', items: [{ nombre: 'x', peso: null }] })
    expect(r.success).toBe(true)
  })
  it('acepta ítem sin peso (promedio directo)', () => {
    const r = CreatePlantillaSchema.safeParse({ nombre: 'P', items: [{ nombre: 'x' }] })
    expect(r.success).toBe(true)
  })
  it('rechaza ítem con peso negativo', () => {
    const r = CreatePlantillaSchema.safeParse({ nombre: 'P', items: [{ nombre: 'x', peso: -5 }] })
    expect(r.success).toBe(false)
  })
  it('rechaza ítem con nombre vacío', () => {
    const r = CreatePlantillaSchema.safeParse({ nombre: 'P', items: [{ nombre: '', peso: 50 }] })
    expect(r.success).toBe(false)
  })
})

describe('AplicarPlantillaSchema', () => {
  it('acepta uuid válido', () => {
    const r = AplicarPlantillaSchema.safeParse({ plantilla_id: UUID_A })
    expect(r.success).toBe(true)
  })
  it('rechaza no-uuid', () => {
    const r = AplicarPlantillaSchema.safeParse({ plantilla_id: 'not-a-uuid' })
    expect(r.success).toBe(false)
  })
})
