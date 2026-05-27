import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'

import { tradeStockBodySchema } from './stock.schema.ts'
import { StockService } from './stock.service.ts'

const stockService = new StockService()

export const registerStockRoutes = (app: Hono) => {
    app.get('/api/v1/stocks/:stockId/price', async (c) => {
        const stockId = c.req.param('stockId')

        const price = await stockService.getLatestPrice(stockId)

        if (!price) {
            return c.json({ error: 'No price found for this stock' }, 404)
        }

        return c.json({ data: price })
    })

    app.post('/api/v1/stocks/buy', zValidator('json', tradeStockBodySchema), async (c) => {
        const { stockId, quantity, userId } = c.req.valid('json')

        const result = await stockService.buy(stockId, quantity, userId)

        return c.json({ data: result })
    })

    app.post('/api/v1/stocks/sell', zValidator('json', tradeStockBodySchema), async (c) => {
        const { stockId, quantity, userId } = c.req.valid('json')

        const result = await stockService.sell(stockId, quantity, userId)

        return c.json({ data: result })
    })
}
