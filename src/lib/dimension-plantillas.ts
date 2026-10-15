import { z } from 'zod'

const ItemSchema = z.object({
  nombre: z.string().min(1).max(100),
  peso:   z.number().nonnegative().nullable().optional(),
}).strict()

export const CreatePlantillaSchema = z.object({
  nombre: z.string().min(1).max(100),
  items:  z.array(ItemSchema).min(1),
}).strict()

export type CreatePlantillaInput = z.infer<typeof CreatePlantillaSchema>

export const AplicarPlantillaSchema = z.object({
  plantilla_id: z.string().uuid(),
}).strict()

export type AplicarPlantillaInput = z.infer<typeof AplicarPlantillaSchema>
