export function calcPromedioReferencia(notas: { valor_numerico: number | null }[]): number | null {
  const valores = notas.map(n => n.valor_numerico).filter((v): v is number => v !== null)
  if (valores.length === 0) return null
  const sum = valores.reduce((acc, v) => acc + v, 0)
  return Math.round((sum / valores.length) * 100) / 100
}
