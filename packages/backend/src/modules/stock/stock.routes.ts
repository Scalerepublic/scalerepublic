import { zValidator } from '@hono/zod-validator'

import { useCtx, type App } from '../../context.ts'

import { calculateStockBodySchema } from './stock.schema.ts'

export const registerStockRoutes = (app: App) => {
    app.get('/api/v1/stocks', (c) => {
        const { stockService } = useCtx(c)
        return c.json({ data: stockService.getAll() })
    })

    app.post('/api/v1/stocks/calculate', zValidator('json', calculateStockBodySchema), (c) => {
        const { symbol, quantity, price } = c.req.valid('json')
        const { stockService } = useCtx(c)
        return c.json({ data: stockService.calculateTotal(symbol, quantity, price) })
    })
}
