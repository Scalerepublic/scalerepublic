import { beforeEach, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { createApp } from '../../src/app.ts'
import { createAppContext } from '../../src/context.ts'
import { db } from '../../src/db/index.ts'
import { portfolio } from '../../src/db/schema/portfolio/portfolio.ts'
import { resetDb, seedPortfolio, seedPrice, seedStock } from '../helpers/db.ts'

const app = createApp(createAppContext())

const post = (path: string, body: unknown) =>
    app.request(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })

beforeEach(resetDb)

describe('portfolio default flow', () => {
    test('defaults portfolio below threshold and creates a new active portfolio', async () => {
        const ctx = createAppContext()
        const { userId, portfolioId } = await seedPortfolio({ cashBalance: '0.50' })

        await ctx.portfolioDefaultService.defaultPortfolio(portfolioId)

        const portfolios = await ctx.portfolioService.getByUserId(userId)
        expect(portfolios).toHaveLength(2)

        const defaulted = portfolios.find((p) => p.id === portfolioId)
        const active = await ctx.portfolioService.getActiveForUser(userId)

        expect(defaulted?.status).toBe('DEFAULTED')
        expect(defaulted?.defaultedAt).not.toBeNull()
        expect(active?.id).not.toBe(portfolioId)
        expect(active?.status).toBe('ACTIVE')
        expect(active?.cashBalance).toBe('1000.00')
        expect(await ctx.portfolioService.getDefaultCount(userId)).toBe(1)
    })

    test('suspends user after third default', async () => {
        const ctx = createAppContext()
        const { userId, portfolioId } = await seedPortfolio({ cashBalance: '0.50' })

        await ctx.portfolioDefaultService.defaultPortfolio(portfolioId)
        let active = await ctx.portfolioService.getActiveForUser(userId)
        expect(active).not.toBeNull()

        await ctx.portfolioDefaultService.defaultPortfolio(active!.id)
        active = await ctx.portfolioService.getActiveForUser(userId)
        expect(active).not.toBeNull()

        await ctx.portfolioDefaultService.defaultPortfolio(active!.id)
        active = await ctx.portfolioService.getActiveForUser(userId)
        expect(active).toBeNull()
        expect(await ctx.portfolioService.getDefaultCount(userId)).toBe(3)

        await expect(ctx.portfolioService.ensureForUser(userId)).rejects.toThrow('suspended')
    })

    test('defaults portfolio after sell drives net worth below threshold', async () => {
        const { userId, portfolioId } = await seedPortfolio({ cashBalance: '1000.00' })
        const { stockId } = await seedStock()
        await seedPrice(stockId, 1000)

        await post('/api/v1/portfolio/buy', { portfolioId, stockId, quantity: 1, price: 1000 })
        await seedPrice(stockId, 0.5)
        await post('/api/v1/portfolio/sell', { portfolioId, stockId, quantity: 1, price: 0.5 })

        const [oldRow] = await db.select().from(portfolio).where(eq(portfolio.id, portfolioId))
        expect(oldRow?.status).toBe('DEFAULTED')

        const ctx = createAppContext()
        const active = await ctx.portfolioService.getActiveForUser(userId)
        expect(active).not.toBeNull()
        expect(active?.id).not.toBe(portfolioId)
    })
})

describe('POST /api/v1/portfolio/default', () => {
    test('requires authentication', async () => {
        const res = await app.request('/api/v1/portfolio/default', { method: 'POST' })
        expect(res.status).toBe(401)
    })
})

describe('GET /api/v1/leaderboard', () => {
    test('ranks users by net worth', async () => {
        const low = await seedPortfolio({ cashBalance: '500.00', name: 'Low Trader' })
        const high = await seedPortfolio({ cashBalance: '2500.00', name: 'High Trader' })

        const res = await app.request('/api/v1/leaderboard?limit=10')
        expect(res.status).toBe(200)

        const schema = z.object({
            data: z.array(z.object({
                rank: z.number(),
                userId: z.string(),
                name: z.string(),
                netWorth: z.number(),
                penaltyCounter: z.number(),
            })),
        })

        const { data } = schema.parse(await res.json())
        expect(data).toHaveLength(2)
        expect(data[0]!.userId).toBe(high.userId)
        expect(data[0]!.rank).toBe(1)
        expect(data[1]!.userId).toBe(low.userId)
        expect(data[1]!.rank).toBe(2)
    })
})

describe('GET /api/v1/users/search', () => {
    test('finds users by name', async () => {
        await seedPortfolio({ name: 'Alice Alpha', email: 'alice@test.com' })
        await seedPortfolio({ name: 'Bob Beta', email: 'bob@test.com' })

        const res = await app.request('/api/v1/users/search?q=Alice&limit=10')
        expect(res.status).toBe(200)

        const schema = z.object({
            data: z.array(z.object({
                userId: z.string(),
                name: z.string(),
            })),
        })

        const { data } = schema.parse(await res.json())
        expect(data).toHaveLength(1)
        expect(data[0]!.name).toBe('Alice Alpha')
    })
})

describe('GET /api/v1/users/:id/performance', () => {
    test('returns performance points for active portfolio', async () => {
        const { userId, portfolioId } = await seedPortfolio({ cashBalance: '1000.00' })
        const { stockId } = await seedStock()
        await seedPrice(stockId, 100)
        await post('/api/v1/portfolio/buy', { portfolioId, stockId, quantity: 2, price: 100 })

        const res = await app.request(`/api/v1/users/${userId}/performance`)
        expect(res.status).toBe(200)

        const schema = z.object({
            data: z.array(z.object({
                date: z.string(),
                value: z.number(),
            })),
        })

        const { data } = schema.parse(await res.json())
        expect(data.length).toBeGreaterThanOrEqual(1)
        const last = data[data.length - 1]!
        expect(last.value).toBeCloseTo(800, 0)
    })
})
