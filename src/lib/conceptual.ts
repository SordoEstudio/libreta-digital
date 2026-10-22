export const VALORES_CONCEPTUALES = [
  { codigo: 'E',  label: 'Excelente' },
  { codigo: 'MB', label: 'Muy Bueno' },
  { codigo: 'B',  label: 'Bueno' },
  { codigo: 'R',  label: 'Regular' },
  { codigo: 'I',  label: 'Insuficiente' },
] as const

export type CodigoConceptual = typeof VALORES_CONCEPTUALES[number]['codigo']

export function labelConceptual(codigo: string): string {
  return VALORES_CONCEPTUALES.find(v => v.codigo === codigo)?.label ?? codigo
}
