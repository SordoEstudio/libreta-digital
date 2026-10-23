export type CierrePreview = {
  total_alumnos: number
  total_materias: number
  // Grouped by materia: if all alumnos of that materia are missing → show_alumnos=false
  materias_sin_notas: Array<{
    materia_id: string
    materia_nombre: string
    curso_nombre: string
    total_alumnos: number
    alumnos_faltantes: number
    show_alumnos: boolean
    alumnos: Array<{ alumno_id: string; alumno_nombre: string }>
  }>
  materias_sin_asistencia: Array<{ materia_id: string; materia_nombre: string; curso_nombre: string }>
  completo: boolean
}

type BuildCierrePreviewOpts = {
  alumnos: Array<{ id: string; nombre: string; apellido: string | null }>
  materias: Array<{ id: string; nombre: string; curso_id: string; curso_nombre: string }>
  inscripciones: Array<{ alumno_id: string; materia_id: string; curso_id: string }>
  evaluacionesPorMateria: Map<string, true>
  notasExistentes: Set<string>
  asistenciaExistente: Set<string>
}

export function buildCierrePreview(opts: BuildCierrePreviewOpts): CierrePreview {
  const { alumnos, materias, inscripciones, evaluacionesPorMateria, notasExistentes, asistenciaExistente } = opts

  const alumnosMap = new Map(alumnos.map(a => [a.id, a]))

  // Count total alumnos per materia (via inscripciones)
  const totalAlumnosPorMateria = new Map<string, number>()
  for (const insc of inscripciones) {
    totalAlumnosPorMateria.set(insc.materia_id, (totalAlumnosPorMateria.get(insc.materia_id) ?? 0) + 1)
  }

  // Build faltantes per materia
  const faltantesPorMateria = new Map<string, Array<{ alumno_id: string; alumno_nombre: string }>>()
  for (const insc of inscripciones) {
    if (!evaluacionesPorMateria.has(insc.materia_id)) continue
    if (!notasExistentes.has(`${insc.alumno_id}:${insc.materia_id}`)) {
      const alumno = alumnosMap.get(insc.alumno_id)
      const nombre = alumno
        ? [alumno.apellido, alumno.nombre].filter(Boolean).join(' ')
        : insc.alumno_id
      const arr = faltantesPorMateria.get(insc.materia_id) ?? []
      arr.push({ alumno_id: insc.alumno_id, alumno_nombre: nombre })
      faltantesPorMateria.set(insc.materia_id, arr)
    }
  }

  const materiasConFaltantes = materias
    .filter(m => faltantesPorMateria.has(m.id))
    .map(m => {
      const faltantes = faltantesPorMateria.get(m.id)!
      const total = totalAlumnosPorMateria.get(m.id) ?? faltantes.length
      const showAlumnos = faltantes.length < total
      return {
        materia_id: m.id,
        materia_nombre: m.nombre,
        curso_nombre: m.curso_nombre,
        total_alumnos: total,
        alumnos_faltantes: faltantes.length,
        show_alumnos: showAlumnos,
        alumnos: showAlumnos ? faltantes : [],
      }
    })

  const materiasSinAsistencia = materias
    .filter(m => evaluacionesPorMateria.has(m.id) && !asistenciaExistente.has(m.id))
    .map(m => ({ materia_id: m.id, materia_nombre: m.nombre, curso_nombre: m.curso_nombre }))

  return {
    total_alumnos: alumnos.length,
    total_materias: materias.length,
    materias_sin_notas: materiasConFaltantes,
    materias_sin_asistencia: materiasSinAsistencia,
    completo: materiasConFaltantes.length === 0 && materiasSinAsistencia.length === 0,
  }
}

export function isPeriodoCerrado(cerrado_at: string | null | undefined): boolean {
  return cerrado_at != null
}
