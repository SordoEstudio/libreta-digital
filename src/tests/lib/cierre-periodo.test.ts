import { describe, it, expect } from 'vitest'
import { buildCierrePreview, isPeriodoCerrado, isCerradoParaCurso, isPublicadoParaCurso } from '@/lib/cierre-periodo'

const alumnos = [{ id: 'a1', nombre: 'Juan', apellido: 'Pérez' }]
const materias = [{ id: 'm1', nombre: 'Inglés', curso_id: 'c1', curso_nombre: '1ro A' }]
const inscripciones = [{ alumno_id: 'a1', materia_id: 'm1', curso_id: 'c1' }]

describe('buildCierrePreview', () => {
  it('completo:true cuando todos los alumnos tienen notas y asistencia', () => {
    const result = buildCierrePreview({
      alumnos,
      materias,
      inscripciones,
      evaluacionesPorMateria: new Map([['m1', true]]),
      notasExistentes: new Set(['a1:m1']),
      asistenciaExistente: new Set(['m1']),
    })
    expect(result.completo).toBe(true)
    expect(result.materias_sin_notas).toHaveLength(0)
    expect(result.materias_sin_asistencia).toHaveLength(0)
  })

  it('detecta alumno sin notas en materia', () => {
    const result = buildCierrePreview({
      alumnos,
      materias,
      inscripciones,
      evaluacionesPorMateria: new Map([['m1', true]]),
      notasExistentes: new Set(),
      asistenciaExistente: new Set(['m1']),
    })
    expect(result.completo).toBe(false)
    expect(result.materias_sin_notas[0].materia_nombre).toBe('Inglés')
    expect(result.materias_sin_notas[0].curso_nombre).toBe('1ro A')
  })

  it('show_alumnos=false cuando todos los alumnos de la materia faltan', () => {
    const result = buildCierrePreview({
      alumnos,
      materias,
      inscripciones,
      evaluacionesPorMateria: new Map([['m1', true]]),
      notasExistentes: new Set(),
      asistenciaExistente: new Set(['m1']),
    })
    expect(result.materias_sin_notas[0].show_alumnos).toBe(false)
    expect(result.materias_sin_notas[0].alumnos).toHaveLength(0)
  })

  it('show_alumnos=true cuando solo algunos alumnos faltan', () => {
    const result = buildCierrePreview({
      alumnos: [
        { id: 'a1', nombre: 'Juan', apellido: 'Pérez' },
        { id: 'a2', nombre: 'Ana', apellido: 'García' },
      ],
      materias,
      inscripciones: [
        { alumno_id: 'a1', materia_id: 'm1', curso_id: 'c1' },
        { alumno_id: 'a2', materia_id: 'm1', curso_id: 'c1' },
      ],
      evaluacionesPorMateria: new Map([['m1', true]]),
      notasExistentes: new Set(['a1:m1']),
      asistenciaExistente: new Set(['m1']),
    })
    expect(result.materias_sin_notas[0].show_alumnos).toBe(true)
    expect(result.materias_sin_notas[0].alumnos[0].alumno_nombre).toBe('García Ana')
  })

  it('no reporta faltante cuando materia no tiene evaluaciones en el período', () => {
    const result = buildCierrePreview({
      alumnos,
      materias,
      inscripciones,
      evaluacionesPorMateria: new Map(),
      notasExistentes: new Set(),
      asistenciaExistente: new Set(),
    })
    expect(result.materias_sin_notas).toHaveLength(0)
  })

  it('isPeriodoCerrado retorna true cuando cerrado_at tiene valor', () => {
    expect(isPeriodoCerrado('2026-10-15T00:00:00Z')).toBe(true)
    expect(isPeriodoCerrado(null)).toBe(false)
    expect(isPeriodoCerrado(undefined)).toBe(false)
  })

  it('detecta materia sin asistencia', () => {
    const result = buildCierrePreview({
      alumnos,
      materias,
      inscripciones,
      evaluacionesPorMateria: new Map([['m1', true]]),
      notasExistentes: new Set(['a1:m1']),
      asistenciaExistente: new Set(),
    })
    expect(result.materias_sin_asistencia[0].materia_id).toBe('m1')
    expect(result.materias_sin_asistencia[0].curso_nombre).toBe('1ro A')
  })
})

describe('isCerradoParaCurso', () => {
  it('false when period open and no override', () => {
    expect(isCerradoParaCurso(null, null)).toBe(false)
  })
  it('true when period closed and no override', () => {
    expect(isCerradoParaCurso('2026-10-01T00:00:00Z', null)).toBe(true)
  })
  it('false when period closed but abierto_at is set (explicit reopen)', () => {
    expect(isCerradoParaCurso('2026-10-01T00:00:00Z', {
      cerrado_at: null, publicado_at: null, abierto_at: '2026-10-10T00:00:00Z'
    })).toBe(false)
  })
  it('true when period open but override has cerrado_at (early close)', () => {
    expect(isCerradoParaCurso(null, {
      cerrado_at: '2026-10-05T00:00:00Z', publicado_at: null, abierto_at: null
    })).toBe(true)
  })
  it('false when override has both cerrado_at and abierto_at (reopen wins)', () => {
    expect(isCerradoParaCurso('2026-10-01T00:00:00Z', {
      cerrado_at: '2026-10-01T00:00:00Z', publicado_at: null, abierto_at: '2026-10-10T00:00:00Z'
    })).toBe(false)
  })
})

describe('isPublicadoParaCurso', () => {
  it('false when period not published and no override', () => {
    expect(isPublicadoParaCurso(null, null)).toBe(false)
  })
  it('true when period published and no override', () => {
    expect(isPublicadoParaCurso('2026-10-02T00:00:00Z', null)).toBe(true)
  })
  it('false when period published but abierto_at overrides', () => {
    expect(isPublicadoParaCurso('2026-10-02T00:00:00Z', {
      cerrado_at: null, publicado_at: null, abierto_at: '2026-10-10T00:00:00Z'
    })).toBe(false)
  })
  it('true when period not published but override has publicado_at', () => {
    expect(isPublicadoParaCurso(null, {
      cerrado_at: '2026-10-05T00:00:00Z', publicado_at: '2026-10-06T00:00:00Z', abierto_at: null
    })).toBe(true)
  })
})
