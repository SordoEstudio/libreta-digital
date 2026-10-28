import { z } from 'zod'
import { zId } from '@/lib/validators'

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
  plantilla_id: zId(),
}).strict()

export type AplicarPlantillaInput = z.infer<typeof AplicarPlantillaSchema>
