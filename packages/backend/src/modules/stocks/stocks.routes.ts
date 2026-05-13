import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { getStockParamsSchema, createStockBodySchema } from './stocks.schema.ts'
import { StocksService } from './stocks.service.ts'

const stocksService = new StocksService()

export const registerStocksRoutes = (app: Hono) => {
    // GET - get the stock price
    app.get('/api/v1/stocks/:id',
        zValidator('param', getStockParamsSchema),
        async (c) => {
            const { id } = c.req.valid('param')
            const stock = await stocksService.getById(id)
            if (!stock) return c.json({ error: 'Stock not found' }, 404)
            return c.json({ data: stock })
        }
    )

    // POST - add the new stock
    app.post('/api/v1/stocks',
        zValidator('json', createStockBodySchema),
        async (c) => {
            const { symbol, name, price } = c.req.valid('json')
            const newStock = await stocksService.create(symbol, name, price)
            return c.json({ data: newStock }, 201)
        }
    )
    // Logical calculation for bulk buying stocks
    app.get('/api/v1/stocks/:id/bulk',
        zValidator('param', getStockParamsSchema),
        async (c) => {
            const { id } = c.req.valid('param')
            const quantity = Number(c.req.query('quantity') ?? 1)
            const result = await stocksService.calculateBulkPrice(id, quantity)
            if (!result) return c.json({ error: 'Stock not found' }, 404)
            return c.json({ data: result })
        }
    )
}
