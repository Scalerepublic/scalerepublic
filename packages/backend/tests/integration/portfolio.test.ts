import { beforeEach, describe, expect, test } from 'bun:test'
import { z } from 'zod'

import { createApp } from '../../src/app.ts'
import { createAppContext } from '../../src/context.ts'
import { resetDb, seedPortfolio, seedPrice, seedStock } from '../helpers/db.ts'

const app = createApp(createAppContext())

const post = (path: string, body: unknown) =>
    app.request(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })

// Response schemas — z.coerce.number() handles postgres-js returning numeric aggregates as strings
const portfolioResponseSchema = z.object({
    data: z.object({
        portfolio: z.object({
            id: z.string(),
            cashBalance: z.string(),
            status: z.string(),
        }),
        holdings: z.array(z.object({
            stockId: z.string(),
            quantity: z.coerce.number(),
            avgCost: z.coerce.number().nullable(),
        })),
        portfolioValue: z.number(),
    }),
})

const tradeResponseSchema = z.object({
    data: z.object({
        id: z.string(),
        tradeType: z.enum(['BUY', 'SELL']),
        quantity: z.number(),
        executedPrice: z.string(),
    }),
})

const valueResponseSchema = z.object({
    data: z.object({
        portfolioId: z.string(),
        portfolioValue: z.number(),
    }),
})

const errorResponseSchema = z.object({ error: z.string() })

beforeEach(resetDb)

describe('GET /api/v1/portfolio/:portfolioId', () => {
    test('returns portfolio with empty holdings and zero value', async () => {
        const { portfolioId } = await seedPortfolio({ cashBalance: '50000.00' })

        const res = await app.request(`/api/v1/portfolio/${portfolioId}`)
        expect(res.status).toBe(200)

        const { data } = portfolioResponseSchema.parse(await res.json())
        expect(data.portfolio.id).toBe(portfolioId)
        expect(parseFloat(data.portfolio.cashBalance)).toBe(50000)
        expect(data.holdings).toEqual([])
        expect(data.portfolioValue).toBe(0)
    })

    test('returns 404 for unknown portfolio', async () => {
        const res = await app.request('/api/v1/portfolio/does-not-exist')
        expect(res.status).toBe(404)
        errorResponseSchema.parse(await res.json())
    })
})

describe('POST /api/v1/portfolio/buy', () => {
    test('deducts cash and creates a holding', async () => {
        const { portfolioId } = await seedPortfolio({ cashBalance: '10000.00' })
        const { stockId } = await seedStock({ ticker: 'AAPL' })
        await seedPrice(stockId, 150)

        const buyRes = await post('/api/v1/portfolio/buy', { portfolioId, stockId, quantity: 10, price: 150 })
        expect(buyRes.status).toBe(200)
        tradeResponseSchema.parse(await buyRes.json())

        const { data } = portfolioResponseSchema.parse(
            await (await app.request(`/api/v1/portfolio/${portfolioId}`)).json()
        )
        expect(parseFloat(data.portfolio.cashBalance)).toBe(8500)
        expect(data.holdings).toHaveLength(1)
        expect(data.holdings[0]!.stockId).toBe(stockId)
        expect(data.holdings[0]!.quantity).toBe(10)
    })

    test('accumulates quantity and recalculates avg cost on repeated buys', async () => {
        const { portfolioId } = await seedPortfolio({ cashBalance: '50000.00' })
        const { stockId } = await seedStock()
        await seedPrice(stockId, 100)

        await post('/api/v1/portfolio/buy', { portfolioId, stockId, quantity: 10, price: 100 })

        await seedPrice(stockId, 200)
        await post('/api/v1/portfolio/buy', { portfolioId, stockId, quantity: 10, price: 200 })

        const { data } = portfolioResponseSchema.parse(
            await (await app.request(`/api/v1/portfolio/${portfolioId}`)).json()
        )
        expect(data.holdings[0]!.quantity).toBe(20)
        expect(data.holdings[0]!.avgCost).toBe(150)
    })

    test('returns 422 when cash balance is insufficient', async () => {
        const { portfolioId } = await seedPortfolio({ cashBalance: '100.00' })
        const { stockId } = await seedStock()
        await seedPrice(stockId, 200)

        const res = await post('/api/v1/portfolio/buy', { portfolioId, stockId, quantity: 1, price: 200 })
        expect(res.status).toBe(422)
        errorResponseSchema.parse(await res.json())
    })

    test('returns 422 when no price is available for the stock', async () => {
        const { portfolioId } = await seedPortfolio()
        const { stockId } = await seedStock()

        const res = await post('/api/v1/portfolio/buy', { portfolioId, stockId, quantity: 1, price: 100 })
        expect(res.status).toBe(422)
        errorResponseSchema.parse(await res.json())
    })

    test('returns 409 when expected price does not match current price', async () => {
        const { portfolioId } = await seedPortfolio()
        const { stockId } = await seedStock()
        await seedPrice(stockId, 105)

        const res = await post('/api/v1/portfolio/buy', { portfolioId, stockId, quantity: 1, price: 100 })
        expect(res.status).toBe(409)
        errorResponseSchema.parse(await res.json())
    })

    test('returns 403 when portfolio has defaulted', async () => {
        const { portfolioId } = await seedPortfolio()
        const { stockId } = await seedStock()
        await seedPrice(stockId, 10)

        const { db } = await import('../../src/db/index.ts')
        const { portfolio } = await import('../../src/db/schema/portfolio/portfolio.ts')
        const { eq } = await import('drizzle-orm')
        await db.update(portfolio).set({ status: 'DEFAULTED' }).where(eq(portfolio.id, portfolioId))

        const res = await post('/api/v1/portfolio/buy', { portfolioId, stockId, quantity: 1, price: 10 })
        expect(res.status).toBe(403)
        errorResponseSchema.parse(await res.json())
    })
})

describe('POST /api/v1/portfolio/sell', () => {
    test('adds proceeds and reduces holding quantity', async () => {
        const { portfolioId } = await seedPortfolio({ cashBalance: '10000.00' })
        const { stockId } = await seedStock()
        await seedPrice(stockId, 100)

        await post('/api/v1/portfolio/buy', { portfolioId, stockId, quantity: 10, price: 100 })

        await seedPrice(stockId, 120)
        const res = await post('/api/v1/portfolio/sell', { portfolioId, stockId, quantity: 4, price: 120 })
        expect(res.status).toBe(200)

        const { data } = portfolioResponseSchema.parse(
            await (await app.request(`/api/v1/portfolio/${portfolioId}`)).json()
        )
        // 10000 - (10 * 100) + (4 * 120) = 9480
        expect(parseFloat(data.portfolio.cashBalance)).toBe(9480)
        expect(data.holdings[0]!.quantity).toBe(6)
    })

    test('returns 422 when trying to sell more than held', async () => {
        const { portfolioId } = await seedPortfolio()
        const { stockId } = await seedStock()
        await seedPrice(stockId, 100)

        await post('/api/v1/portfolio/buy', { portfolioId, stockId, quantity: 3, price: 100 })
        const res = await post('/api/v1/portfolio/sell', { portfolioId, stockId, quantity: 5, price: 100 })
        expect(res.status).toBe(422)
        errorResponseSchema.parse(await res.json())
    })

    test('returns 422 when holding does not exist', async () => {
        const { portfolioId } = await seedPortfolio()
        const { stockId } = await seedStock()
        await seedPrice(stockId, 100)

        const res = await post('/api/v1/portfolio/sell', { portfolioId, stockId, quantity: 1, price: 100 })
        expect(res.status).toBe(422)
        errorResponseSchema.parse(await res.json())
    })

    test('returns 409 when expected price does not match current price', async () => {
        const { portfolioId } = await seedPortfolio()
        const { stockId } = await seedStock()
        await seedPrice(stockId, 100)

        await post('/api/v1/portfolio/buy', { portfolioId, stockId, quantity: 1, price: 100 })

        await seedPrice(stockId, 110)
        const res = await post('/api/v1/portfolio/sell', { portfolioId, stockId, quantity: 1, price: 100 })
        expect(res.status).toBe(409)
        errorResponseSchema.parse(await res.json())
    })
})

describe('GET /api/v1/portfolio/:portfolioId/value', () => {
    test('reflects latest seeded stock price', async () => {
        const { portfolioId } = await seedPortfolio({ cashBalance: '10000.00' })
        const { stockId } = await seedStock()
        await seedPrice(stockId, 100)

        await post('/api/v1/portfolio/buy', { portfolioId, stockId, quantity: 10, price: 100 })
        await seedPrice(stockId, 200)

        const res = await app.request(`/api/v1/portfolio/${portfolioId}/value`)
        expect(res.status).toBe(200)
        const { data } = valueResponseSchema.parse(await res.json())
        expect(data.portfolioValue).toBe(2000)
    })

    test('returns 0 when there are no holdings', async () => {
        const { portfolioId } = await seedPortfolio()

        const { data } = valueResponseSchema.parse(
            await (await app.request(`/api/v1/portfolio/${portfolioId}/value`)).json()
        )
        expect(data.portfolioValue).toBe(0)
    })
})
