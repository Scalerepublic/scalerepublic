import { zValidator } from '@hono/zod-validator'
import { calculateStockBodySchema } from './stock.schema.ts'

import { Hono } from 'hono'

import { StockService } from './stock.service.ts'


const stockService = new StockService()

export const registerStockRoutes = (app: Hono) => {
    app.get('/api/v1/stocks', (c) => {
        const stocks = stockService.getAll()

        return c.json({ data: stocks })
    })
    app.post('/api/v1/stocks/calculate', zValidator('json', calculateStockBodySchema), async (c) => {
    const { symbol, quantity, price } = c.req.valid('json')

    const result = stockService.calculateTotal(symbol, quantity, price)

    return c.json({ data: result })
})
}
