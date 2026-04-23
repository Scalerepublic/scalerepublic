import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'

import { getExampleParamsSchema } from './example.schema.ts'
import { ExampleService } from './example.service.ts'

const exampleService = new ExampleService()

export const registerExampleRoutes = (app: Hono) => {
    app.get('/api/v1/example/:id', zValidator('param', getExampleParamsSchema), async (c) => {
        const { id } = c.req.valid('param')
        const item = await exampleService.getById(id)

        if (!item) {
            return c.json({ error: 'Example item not found' }, 404)
        }

        return c.json({ data: item })
    })
}
