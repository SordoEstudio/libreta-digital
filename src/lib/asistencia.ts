/**
 * Calcula el porcentaje de asistencia.
 * Retorna null cuando total_clases es 0 para evitar división por cero.
 */
export function calcularPorcentajeAsistencia(
  total_clases: number,
  inasistencias_justificadas: number,
  inasistencias_injustificadas: number,
): number | null {
  if (total_clases === 0) return null
  const presentes = total_clases - inasistencias_justificadas - inasistencias_injustificadas
  return Math.round((presentes / total_clases) * 1000) / 10
}
