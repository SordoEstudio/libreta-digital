export type CierrePreview = {
  total_alumnos: number
  total_materias: number
  alumnos_sin_notas: Array<{ alumno_id: string; alumno_nombre: string; materias_sin_notas: string[] }>
  materias_sin_asistencia: Array<{ materia_id: string; materia_nombre: string }>
  completo: boolean
}

type BuildCierrePreviewOpts = {
  alumnos: Array<{ id: string; nombre: string }>
  materias: Array<{ id: string; nombre: string }>
  inscripciones: Array<{ alumno_id: string; materia_id: string }>
  evaluacionesPorMateria: Map<string, true>
  notasExistentes: Set<string>
  asistenciaExistente: Set<string>
}

export function buildCierrePreview(opts: BuildCierrePreviewOpts): CierrePreview {
  const { alumnos, materias, inscripciones, evaluacionesPorMateria, notasExistentes, asistenciaExistente } = opts

  const materiasMap = new Map(materias.map(m => [m.id, m.nombre]))

  const alumnosFaltantes: CierrePreview['alumnos_sin_notas'] = []

  for (const alumno of alumnos) {
    const materiasFaltantes: string[] = []
    for (const insc of inscripciones) {
      if (insc.alumno_id !== alumno.id) continue
      if (!evaluacionesPorMateria.has(insc.materia_id)) continue
      if (!notasExistentes.has(`${alumno.id}:${insc.materia_id}`)) {
        const nombre = materiasMap.get(insc.materia_id) ?? insc.materia_id
        materiasFaltantes.push(nombre)
      }
    }
    if (materiasFaltantes.length > 0) {
      alumnosFaltantes.push({ alumno_id: alumno.id, alumno_nombre: alumno.nombre, materias_sin_notas: materiasFaltantes })
    }
  }

  const materiasSinAsistencia: CierrePreview['materias_sin_asistencia'] = []
  for (const materia of materias) {
    if (!evaluacionesPorMateria.has(materia.id)) continue
    if (!asistenciaExistente.has(materia.id)) {
      materiasSinAsistencia.push({ materia_id: materia.id, materia_nombre: materia.nombre })
    }
  }

  return {
    total_alumnos: alumnos.length,
    total_materias: materias.length,
    alumnos_sin_notas: alumnosFaltantes,
    materias_sin_asistencia: materiasSinAsistencia,
    completo: alumnosFaltantes.length === 0 && materiasSinAsistencia.length === 0,
  }
}

export function isPeriodoCerrado(cerrado_at: string | null | undefined): boolean {
  return cerrado_at != null
}
