import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'

import { useCtx, type App, type AppEnv } from '../../context.ts'

import { calculateStockBodySchema, priceHistoryQuerySchema, stockDetailQuerySchema } from './stock.schema.ts'

export const stockRoutes = new Hono<AppEnv>()
    .get('/api/v1/stocks', async (c) => {
        const { stockService } = useCtx(c)
        return c.json({ data: await stockService.getAll() })
    })
    .get('/api/v1/stocks/:ticker/price-history', zValidator('query', priceHistoryQuerySchema), async (c) => {
        const { ticker } = c.req.param()
        const { from, to } = c.req.valid('query')
        const { stockService } = useCtx(c)
        const history = await stockService.getPriceHistory(ticker, from, to)
        if (history === null) return c.json({ error: 'Stock not found' }, 404)
        return c.json({ data: history })
    })
    .get('/api/v1/stocks/:ticker/detail', zValidator('query', stockDetailQuerySchema), async (c) => {
        const { ticker } = c.req.param()
        const { priceFrom, priceTo, userId } = c.req.valid('query')
        const { stockService } = useCtx(c)

        // Convert ISO date strings to Date objects
        const priceFromDate =
            priceFrom !== undefined && priceFrom !== ''
                ? new Date(priceFrom)
                : undefined

        const priceToDate =
            priceTo !== undefined && priceTo !== ''
                ? new Date(priceTo)
                : undefined

        const detail = await stockService.getStockDetail(ticker, userId, priceFromDate, priceToDate)

        if (detail === null) {
            return c.json({ error: 'Stock not found' }, 404)
        }

        return c.json({ data: detail })
    })
    .post('/api/v1/stocks/calculate', zValidator('json', calculateStockBodySchema), (c) => {
        const { symbol, quantity, price } = c.req.valid('json')
        const { stockService } = useCtx(c)
        return c.json({ data: stockService.calculateTotal(symbol, quantity, price) })
    })

export const registerStockRoutes = (app: App) => {
    app.route('/', stockRoutes)
}
