export type HorarioEvento = {
  id: string
  materiaId: string
  materiaNombre: string
  cursoId: string
  cursoNombre: string
  docenteId: string | null
  docenteNombre: string | null
  dia_semana: number
  hora_inicio: string
  hora_fin: string
  aula: string | null
  colorIndex: number
}

export type EvaluacionEvento = {
  id: string
  nombre: string
  tipo: string
  materiaNombre: string
  cursoNombre: string
  fecha: string
  colorIndex: number
}

export type Conflicto = {
  tipo: 'docente' | 'curso'
  nombreRecurso: string
  dia: number
  diaLabel: string
  horarioA: Pick<HorarioEvento, 'id' | 'materiaId' | 'materiaNombre' | 'cursoNombre' | 'hora_inicio' | 'hora_fin'>
  horarioB: Pick<HorarioEvento, 'id' | 'materiaId' | 'materiaNombre' | 'cursoNombre' | 'hora_inicio' | 'hora_fin'>
}

const DIAS_LABEL = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

function timeToMinutes(time: string): number {
  const parts = time.split(':')
  return parseInt(parts[0]) * 60 + parseInt(parts[1])
}

function overlaps(a: HorarioEvento, b: HorarioEvento): boolean {
  const aStart = timeToMinutes(a.hora_inicio)
  const aEnd = timeToMinutes(a.hora_fin)
  const bStart = timeToMinutes(b.hora_inicio)
  const bEnd = timeToMinutes(b.hora_fin)
  return aStart < bEnd && bStart < aEnd
}

export function detectConflicts(horarios: HorarioEvento[]): Conflicto[] {
  const conflictos: Conflicto[] = []
  const dias = [...new Set(horarios.map(h => h.dia_semana))]

  for (const dia of dias) {
    const dayHorarios = horarios.filter(h => h.dia_semana === dia)

    // Conflictos por curso — alumnos no pueden estar en dos clases solapadas
    const byCurso = new Map<string, HorarioEvento[]>()
    for (const h of dayHorarios) {
      if (!h.cursoId) continue
      const arr = byCurso.get(h.cursoId) ?? []
      arr.push(h)
      byCurso.set(h.cursoId, arr)
    }
    for (const [, group] of byCurso) {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          if (overlaps(group[i], group[j])) {
            conflictos.push({
              tipo: 'curso',
              nombreRecurso: group[i].cursoNombre,
              dia,
              diaLabel: DIAS_LABEL[dia] ?? `Día ${dia}`,
              horarioA: group[i],
              horarioB: group[j],
            })
          }
        }
      }
    }

    // Conflictos por docente — docente no puede estar en dos materias solapadas
    const byDocente = new Map<string, HorarioEvento[]>()
    for (const h of dayHorarios) {
      if (!h.docenteId) continue
      const arr = byDocente.get(h.docenteId) ?? []
      arr.push(h)
      byDocente.set(h.docenteId, arr)
    }
    for (const [, group] of byDocente) {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          if (overlaps(group[i], group[j])) {
            conflictos.push({
              tipo: 'docente',
              nombreRecurso: group[i].docenteNombre ?? '',
              dia,
              diaLabel: DIAS_LABEL[dia] ?? `Día ${dia}`,
              horarioA: group[i],
              horarioB: group[j],
            })
          }
        }
      }
    }
  }

  return conflictos
}

export function conflictIdsSet(conflictos: Conflicto[]): Set<string> {
  const ids = new Set<string>()
  for (const c of conflictos) {
    ids.add(c.horarioA.id)
    ids.add(c.horarioB.id)
  }
  return ids
}

export function colorIndex(id: string): number {
  let hash = 0
  for (const c of id) hash = (hash << 5) - hash + c.charCodeAt(0)
  return Math.abs(hash) % 8
}
