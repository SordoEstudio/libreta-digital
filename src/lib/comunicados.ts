import { z } from 'zod'

export function deduplicarResponsables(
  rows: { persona_id: string; email: string }[]
): { persona_id: string; email: string }[] {
  const seen = new Set<string>()
  return rows.filter(r => {
    if (seen.has(r.persona_id)) return false
    seen.add(r.persona_id)
    return true
  })
}

export const CreateComunicadoSchema = z.object({
  titulo: z.string().min(1).max(300),
  contenido: z.string().min(1).max(5000),
  curso_id: z.string().uuid(),
}).strict()

export type CreateComunicadoInput = z.infer<typeof CreateComunicadoSchema>
