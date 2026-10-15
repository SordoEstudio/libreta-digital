import { describe, it, expect } from 'vitest'
import { buildCierrePreview, isPeriodoCerrado } from '@/lib/cierre-periodo'

describe('buildCierrePreview', () => {
  it('completo:true cuando todos los alumnos tienen notas y asistencia', () => {
    const result = buildCierrePreview({
      alumnos: [{ id: 'a1', nombre: 'Juan' }],
      materias: [{ id: 'm1', nombre: 'Inglés' }],
      inscripciones: [{ alumno_id: 'a1', materia_id: 'm1' }],
      evaluacionesPorMateria: new Map([['m1', true]]),
      notasExistentes: new Set(['a1:m1']),
      asistenciaExistente: new Set(['m1']),
    })
    expect(result.completo).toBe(true)
    expect(result.alumnos_sin_notas).toHaveLength(0)
    expect(result.materias_sin_asistencia).toHaveLength(0)
  })

  it('detecta alumno sin notas en materia', () => {
    const result = buildCierrePreview({
      alumnos: [{ id: 'a1', nombre: 'Juan' }],
      materias: [{ id: 'm1', nombre: 'Inglés' }],
      inscripciones: [{ alumno_id: 'a1', materia_id: 'm1' }],
      evaluacionesPorMateria: new Map([['m1', true]]),
      notasExistentes: new Set(),
      asistenciaExistente: new Set(['m1']),
    })
    expect(result.completo).toBe(false)
    expect(result.alumnos_sin_notas[0].materias_sin_notas).toContain('Inglés')
  })

  it('no reporta faltante cuando materia no tiene evaluaciones en el período', () => {
    const result = buildCierrePreview({
      alumnos: [{ id: 'a1', nombre: 'Juan' }],
      materias: [{ id: 'm1', nombre: 'Inglés' }],
      inscripciones: [{ alumno_id: 'a1', materia_id: 'm1' }],
      evaluacionesPorMateria: new Map(), // sin evaluaciones → no hay nada que completar
      notasExistentes: new Set(),
      asistenciaExistente: new Set(),
    })
    expect(result.alumnos_sin_notas).toHaveLength(0)
  })

  it('isPeriodoCerrado retorna true cuando cerrado_at tiene valor', () => {
    expect(isPeriodoCerrado('2026-10-15T00:00:00Z')).toBe(true)
    expect(isPeriodoCerrado(null)).toBe(false)
    expect(isPeriodoCerrado(undefined)).toBe(false)
  })

  it('no incluye materia en asistencia_sin_cargar si no tiene total_clases > 0', () => {
    const result = buildCierrePreview({
      alumnos: [{ id: 'a1', nombre: 'Juan' }],
      materias: [{ id: 'm1', nombre: 'Inglés' }],
      inscripciones: [{ alumno_id: 'a1', materia_id: 'm1' }],
      evaluacionesPorMateria: new Map([['m1', true]]),
      notasExistentes: new Set(['a1:m1']),
      asistenciaExistente: new Set(), // sin registros con total_clases > 0
    })
    expect(result.materias_sin_asistencia[0].materia_id).toBe('m1')
  })
})
