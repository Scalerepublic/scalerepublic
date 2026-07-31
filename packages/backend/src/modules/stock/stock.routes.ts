import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'

import { useCtx, type App, type AppEnv } from '../../context.ts'

import {
    priceHistoryQuerySchema,
    stockDetailQuerySchema,
    stockListQuerySchema,
    stockTrendingQuerySchema,
} from './stock.schema.ts'

const normalizeTicker = (ticker: string): string => ticker.trim().toUpperCase()

export const stockRoutes = new Hono<AppEnv>()
    .get('/api/v1/stocks/trending', zValidator('query', stockTrendingQuerySchema), async (c) => {
        const { limit } = c.req.valid('query')
        const { stockService } = useCtx(c)
        return c.json({ data: await stockService.getTrending(limit) })
    })
    .get('/api/v1/stocks/sectors', async (c) => {
        const { stockService } = useCtx(c)
        return c.json({ data: await stockService.getSectorCatalog() })
    })
    .get('/api/v1/stocks', zValidator('query', stockListQuerySchema), async (c) => {
        const query = c.req.valid('query')
        const { stockService } = useCtx(c)
        return c.json({ data: await stockService.listStocks(query) })
    })
    .get('/api/v1/stocks/:ticker/price-history', zValidator('query', priceHistoryQuerySchema), async (c) => {
        const ticker = normalizeTicker(c.req.param('ticker'))
        const { from, to } = c.req.valid('query')
        const { stockService } = useCtx(c)
        const history = await stockService.getPriceHistory(ticker, from, to)
        if (history === null) return c.json({ error: 'Stock not found' }, 404)
        return c.json({ data: history })
    })
    .get('/api/v1/stocks/:ticker/detail', zValidator('query', stockDetailQuerySchema), async (c) => {
        const ticker = normalizeTicker(c.req.param('ticker'))
        const { historyDays } = c.req.valid('query')
        const { stockService } = useCtx(c)

        const detail = await stockService.getStockDetail(ticker, historyDays)

        if (detail === null) {
            return c.json({ error: 'Stock not found' }, 404)
        }

        return c.json({ data: detail })
    })

export const registerStockRoutes = (app: App) => {
    app.route('/', stockRoutes)
}
