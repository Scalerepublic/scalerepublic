import { beforeEach, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { createApp } from '../../src/app.ts'
import { createAppContext } from '../../src/context.ts'
import { db } from '../../src/db/index.ts'
import { portfolio } from '../../src/db/schema/portfolio/portfolio.ts'
import { resetDb, seedPortfolio, seedPrice, seedStock } from '../helpers/db.ts'

const ctx = createAppContext()
const app = createApp(ctx)

const post = (path: string, body: unknown) =>
    app.request(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })

const ruleSchema = z.object({
    id: z.string(),
    portfolioId: z.string(),
    stockId: z.string(),
    ruleType: z.enum(['BUY', 'SELL']),
    triggerDirection: z.enum(['AT_OR_ABOVE', 'AT_OR_BELOW']),
    priceThreshold: z.string(),
    quantity: z.number(),
    status: z.string(),
})
const ruleResponse = z.object({ data: ruleSchema })
const rulesResponse = z.object({ data: z.array(ruleSchema) })
const errorResponse = z.object({ error: z.string() })

beforeEach(resetDb)

describe('POST /api/v1/autotrade', () => {
    test('creates an ACTIVE stop-loss rule and returns 201', async () => {
        const { portfolioId } = await seedPortfolio({ cashBalance: '10000.00' })
        const { stockId } = await seedStock()
        await seedPrice(stockId, 100)
        await ctx.portfolioService.buy(portfolioId, stockId, 10, 100) // Hold 10 to sell against

        const res = await post('/api/v1/autotrade', {
            portfolioId, stockId, ruleType: 'SELL', triggerDirection: 'AT_OR_BELOW', priceThreshold: 20, quantity: 5,
        })
        expect(res.status).toBe(201)

        const { data } = ruleResponse.parse(await res.json())
        expect(data.status).toBe('ACTIVE')
        expect(data.ruleType).toBe('SELL')
        expect(data.triggerDirection).toBe('AT_OR_BELOW')
        expect(data.quantity).toBe(5)
    })

    test('returns 400 when triggerDirection is missing', async () => {
        const { portfolioId } = await seedPortfolio()
        const { stockId } = await seedStock()

        const res = await post('/api/v1/autotrade', {
            portfolioId, stockId, ruleType: 'BUY', priceThreshold: 20, quantity: 5,
        })
        expect(res.status).toBe(400)
    })

    test('returns 400 for an invalid quantity', async () => {
        const { portfolioId } = await seedPortfolio()
        const { stockId } = await seedStock()

        const res = await post('/api/v1/autotrade', {
            portfolioId, stockId, ruleType: 'BUY', triggerDirection: 'AT_OR_BELOW', priceThreshold: 20, quantity: 0,
        })
        expect(res.status).toBe(400)
    })

    test('returns 400 for a past expiry', async () => {
        const { portfolioId } = await seedPortfolio()
        const { stockId } = await seedStock()

        const res = await post('/api/v1/autotrade', {
            portfolioId,
            stockId,
            ruleType: 'BUY', triggerDirection: 'AT_OR_BELOW',
            priceThreshold: 20,
            quantity: 1,
            expiresAt: new Date(Date.now() - 1000).toISOString(),
        })
        expect(res.status).toBe(400)
        errorResponse.parse(await res.json())
    })

    test('returns 404 for an unknown portfolio', async () => {
        const { stockId } = await seedStock()

        const res = await post('/api/v1/autotrade', {
            portfolioId: 'nope', stockId, ruleType: 'BUY', triggerDirection: 'AT_OR_BELOW', priceThreshold: 20, quantity: 1,
        })
        expect(res.status).toBe(404)
        errorResponse.parse(await res.json())
    })

    test('returns 403 for a defaulted portfolio', async () => {
        const { portfolioId } = await seedPortfolio()
        const { stockId } = await seedStock()
        await db.update(portfolio).set({ status: 'DEFAULTED' }).where(eq(portfolio.id, portfolioId))

        const res = await post('/api/v1/autotrade', {
            portfolioId, stockId, ruleType: 'BUY', triggerDirection: 'AT_OR_BELOW', priceThreshold: 20, quantity: 1,
        })
        expect(res.status).toBe(403)
        errorResponse.parse(await res.json())
    })

    test('returns 422 for a BUY the portfolio cannot afford', async () => {
        const { portfolioId } = await seedPortfolio({ cashBalance: '50.00' })
        const { stockId } = await seedStock()

        const res = await post('/api/v1/autotrade', {
            portfolioId, stockId, ruleType: 'BUY', triggerDirection: 'AT_OR_BELOW', priceThreshold: 20, quantity: 5,
        })
        expect(res.status).toBe(422)
        errorResponse.parse(await res.json())
    })

    test('returns 422 for a SELL exceeding holdings', async () => {
        const { portfolioId } = await seedPortfolio()
        const { stockId } = await seedStock()

        const res = await post('/api/v1/autotrade', {
            portfolioId, stockId, ruleType: 'SELL', triggerDirection: 'AT_OR_ABOVE', priceThreshold: 20, quantity: 1,
        })
        expect(res.status).toBe(422)
        errorResponse.parse(await res.json())
    })
})

describe('GET /api/v1/portfolio/:portfolioId/autotrades', () => {
    test('lists the rules for a portfolio', async () => {
        const { portfolioId } = await seedPortfolio({ cashBalance: '10000.00' })
        const { stockId: s1 } = await seedStock({ ticker: 'AAA' })
        const { stockId: s2 } = await seedStock({ ticker: 'BBB' })
        await seedPrice(s2, 25)
        await ctx.portfolioService.buy(portfolioId, s2, 5, 25) // Hold s2 for the SELL rule

        const created = await Promise.all([
            post('/api/v1/autotrade', { portfolioId, stockId: s1, ruleType: 'BUY', triggerDirection: 'AT_OR_BELOW', priceThreshold: 10, quantity: 1 }),
            post('/api/v1/autotrade', { portfolioId, stockId: s2, ruleType: 'SELL', triggerDirection: 'AT_OR_ABOVE', priceThreshold: 30, quantity: 2 }),
        ])
        const ids = await Promise.all(created.map(async (r) => ruleResponse.parse(await r.json()).data.id))

        const res = await app.request(`/api/v1/portfolio/${portfolioId}/autotrades`)
        expect(res.status).toBe(200)

        const { data } = rulesResponse.parse(await res.json())
        expect(data).toHaveLength(2)
        expect(data.map((r) => r.id).sort()).toEqual([...ids].sort())
    })

    test('returns an empty list for a portfolio with no rules', async () => {
        const { portfolioId } = await seedPortfolio()

        const res = await app.request(`/api/v1/portfolio/${portfolioId}/autotrades`)
        const { data } = rulesResponse.parse(await res.json())
        expect(data).toEqual([])
    })
})

describe('POST /api/v1/autotrade/:ruleId/cancel', () => {
    test('cancels an active rule', async () => {
        const { portfolioId } = await seedPortfolio()
        const { stockId } = await seedStock()
        const created = ruleResponse.parse(
            await (await post('/api/v1/autotrade', {
                portfolioId, stockId, ruleType: 'BUY', triggerDirection: 'AT_OR_BELOW', priceThreshold: 20, quantity: 1,
            })).json(),
        )

        const res = await post(`/api/v1/autotrade/${created.data.id}/cancel`, {})
        expect(res.status).toBe(200)
        const { data } = ruleResponse.parse(await res.json())
        expect(data.status).toBe('CANCELLED')
    })

    test('returns 404 when the rule is not active', async () => {
        const { portfolioId } = await seedPortfolio()
        const { stockId } = await seedStock()
        const created = ruleResponse.parse(
            await (await post('/api/v1/autotrade', {
                portfolioId, stockId, ruleType: 'BUY', triggerDirection: 'AT_OR_BELOW', priceThreshold: 20, quantity: 1,
            })).json(),
        )
        await post(`/api/v1/autotrade/${created.data.id}/cancel`, {})

        const res = await post(`/api/v1/autotrade/${created.data.id}/cancel`, {})
        expect(res.status).toBe(404)
        errorResponse.parse(await res.json())
    })

    test('returns 404 for an unknown rule id', async () => {
        const res = await post('/api/v1/autotrade/does-not-exist/cancel', {})
        expect(res.status).toBe(404)
        errorResponse.parse(await res.json())
    })

    test('the cancelled status is reflected in the list route', async () => {
        const { portfolioId } = await seedPortfolio()
        const { stockId } = await seedStock()
        const created = ruleResponse.parse(
            await (await post('/api/v1/autotrade', {
                portfolioId, stockId, ruleType: 'BUY', triggerDirection: 'AT_OR_BELOW', priceThreshold: 20, quantity: 1,
            })).json(),
        )
        await post(`/api/v1/autotrade/${created.data.id}/cancel`, {})

        const { data } = rulesResponse.parse(
            await (await app.request(`/api/v1/portfolio/${portfolioId}/autotrades`)).json(),
        )
        expect(data).toHaveLength(1)
        expect(data[0]!.status).toBe('CANCELLED')
    })
})
