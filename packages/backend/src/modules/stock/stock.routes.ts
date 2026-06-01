import { zValidator } from '@hono/zod-validator'

import { useCtx, type App } from '../../context.ts'

import { calculateStockBodySchema, priceHistoryQuerySchema } from './stock.schema.ts'

export const registerStockRoutes = (app: App) => {
    app.get('/api/v1/stocks', async (c) => {
        const { stockService } = useCtx(c)
        return c.json({ data: await stockService.getAll() })
    })

    app.get('/api/v1/stocks/:ticker/price-history', zValidator('query', priceHistoryQuerySchema), async (c) => {
        const { ticker } = c.req.param()
        const { from, to } = c.req.valid('query')
        const { stockService } = useCtx(c)
        const history = await stockService.getPriceHistory(ticker, from, to)
        if (history === null) return c.json({ error: 'Stock not found' }, 404)
        return c.json({ data: history })
    })

    app.post('/api/v1/stocks/calculate', zValidator('json', calculateStockBodySchema), (c) => {
        const { symbol, quantity, price } = c.req.valid('json')
        const { stockService } = useCtx(c)
        return c.json({ data: stockService.calculateTotal(symbol, quantity, price) })
    })
}
