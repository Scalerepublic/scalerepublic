import { z } from 'zod'

export const getExampleParamsSchema = z.object({
    id: z.string().uuid(),
})
