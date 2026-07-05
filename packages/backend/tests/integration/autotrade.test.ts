import { beforeEach, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'

import { createAppContext } from '../../src/context.ts'
import { db } from '../../src/db/index.ts'
import { portfolio } from '../../src/db/schema/portfolio/portfolio.ts'
import { autoTradeRule } from '../../src/db/schema/trade/autoTrade.ts'
import { trade } from '../../src/db/schema/trade/trade.ts'
import { AutoTradeNotFoundError, InvalidAutoTradeError } from '../../src/modules/autotrade/index.ts'
import { PortfolioDefaultedError, PortfolioNotFoundError } from '../../src/modules/portfolio/errors.ts'
import { resetDb, seedPortfolio, seedPrice, seedStock } from '../helpers/db.ts'

const ctx = createAppContext()

const getRule = async (id: string) => {
    const [row] = await db.select().from(autoTradeRule).where(eq(autoTradeRule.id, id))
    return row
}

beforeEach(resetDb)

describe('AutoTradeService.createAutoTrade', () => {
    test('creates an ACTIVE rule for an active portfolio', async () => {
        const { portfolioId } = await seedPortfolio()
        const { stockId } = await seedStock()

        const rule = await ctx.autoTradeService.createAutoTrade({
            portfolioId,
            stockId,
            ruleType: 'BUY',
            priceThreshold: 20,
            quantity: 5,
        })

        expect(rule.status).toBe('ACTIVE')
        expect(rule.priceThreshold).toBe('20.0000')
        expect(rule.quantity).toBe(5)
    })

    test('rejects non-positive quantity', async () => {
        const { portfolioId } = await seedPortfolio()
        const { stockId } = await seedStock()

        await expect(
            ctx.autoTradeService.createAutoTrade({ portfolioId, stockId, ruleType: 'BUY', priceThreshold: 20, quantity: 0 }),
        ).rejects.toBeInstanceOf(InvalidAutoTradeError)
    })

    test('rejects a past expiry', async () => {
        const { portfolioId } = await seedPortfolio()
        const { stockId } = await seedStock()

        await expect(
            ctx.autoTradeService.createAutoTrade({
                portfolioId,
                stockId,
                ruleType: 'BUY',
                priceThreshold: 20,
                quantity: 1,
                expiresAt: new Date(Date.now() - 1000),
            }),
        ).rejects.toBeInstanceOf(InvalidAutoTradeError)
    })

    test('rejects an unknown portfolio', async () => {
        const { stockId } = await seedStock()
        await expect(
            ctx.autoTradeService.createAutoTrade({ portfolioId: 'nope', stockId, ruleType: 'BUY', priceThreshold: 20, quantity: 1 }),
        ).rejects.toBeInstanceOf(PortfolioNotFoundError)
    })

    test('rejects a defaulted portfolio', async () => {
        const { portfolioId } = await seedPortfolio()
        const { stockId } = await seedStock()
        await db.update(portfolio).set({ status: 'DEFAULTED' }).where(eq(portfolio.id, portfolioId))

        await expect(
            ctx.autoTradeService.createAutoTrade({ portfolioId, stockId, ruleType: 'BUY', priceThreshold: 20, quantity: 1 }),
        ).rejects.toBeInstanceOf(PortfolioDefaultedError)
    })
})

describe('AutoTradeService.cancelAutoTrade', () => {
    test('cancels an active rule', async () => {
        const { portfolioId } = await seedPortfolio()
        const { stockId } = await seedStock()
        const rule = await ctx.autoTradeService.createAutoTrade({
            portfolioId,
            stockId,
            ruleType: 'BUY',
            priceThreshold: 20,
            quantity: 1,
        })

        const cancelled = await ctx.autoTradeService.cancelAutoTrade(rule.id)
        expect(cancelled.status).toBe('CANCELLED')
    })

    test('throws when the rule is not active', async () => {
        const { portfolioId } = await seedPortfolio()
        const { stockId } = await seedStock()
        const rule = await ctx.autoTradeService.createAutoTrade({
            portfolioId,
            stockId,
            ruleType: 'BUY',
            priceThreshold: 20,
            quantity: 1,
        })
        await ctx.autoTradeService.cancelAutoTrade(rule.id)

        await expect(ctx.autoTradeService.cancelAutoTrade(rule.id)).rejects.toBeInstanceOf(AutoTradeNotFoundError)
    })
})

describe('AutoTradeService.executeAutoTrade', () => {
    test('executes a BUY when price falls to/below threshold', async () => {
        const { portfolioId } = await seedPortfolio({ cashBalance: '10000.00' })
        const { stockId } = await seedStock()
        await seedPrice(stockId, 20)

        const rule = await ctx.autoTradeService.createAutoTrade({
            portfolioId,
            stockId,
            ruleType: 'BUY',
            priceThreshold: 20,
            quantity: 5,
        })

        const executed = await ctx.autoTradeService.executeAutoTrade(rule)
        expect(executed).not.toBeNull()
        expect(executed!.tradeType).toBe('BUY')
        expect(executed!.autoTradeRuleId).toBe(rule.id)

        const updated = await getRule(rule.id)
        expect(updated!.status).toBe('TRIGGERED')
        expect(updated!.triggeredTradeId).toBe(executed!.id)

        const p = await ctx.portfolioService.getById(portfolioId)
        expect(parseFloat(p.cashBalance)).toBe(9900) // 10000 - 5*20
    })

    test('executes a SELL when price rises to/above threshold', async () => {
        const { portfolioId } = await seedPortfolio({ cashBalance: '10000.00' })
        const { stockId } = await seedStock()
        await seedPrice(stockId, 100)
        await ctx.portfolioService.buy(portfolioId, stockId, 10, 100)

        await seedPrice(stockId, 150)
        const rule = await ctx.autoTradeService.createAutoTrade({
            portfolioId,
            stockId,
            ruleType: 'SELL',
            priceThreshold: 150,
            quantity: 4,
        })

        const executed = await ctx.autoTradeService.executeAutoTrade(rule)
        expect(executed!.tradeType).toBe('SELL')

        const updated = await getRule(rule.id)
        expect(updated!.status).toBe('TRIGGERED')
    })

    test('does not fire while the threshold is unmet', async () => {
        const { portfolioId } = await seedPortfolio({ cashBalance: '10000.00' })
        const { stockId } = await seedStock()
        await seedPrice(stockId, 25) // Above the BUY threshold

        const rule = await ctx.autoTradeService.createAutoTrade({
            portfolioId,
            stockId,
            ruleType: 'BUY',
            priceThreshold: 20,
            quantity: 1,
        })

        expect(await ctx.autoTradeService.executeAutoTrade(rule)).toBeNull()
        expect((await getRule(rule.id))!.status).toBe('ACTIVE')
    })

    test('leaves the rule ACTIVE and records no trade on insufficient funds', async () => {
        const { portfolioId } = await seedPortfolio({ cashBalance: '10.00' })
        const { stockId } = await seedStock()
        await seedPrice(stockId, 20)

        const rule = await ctx.autoTradeService.createAutoTrade({
            portfolioId,
            stockId,
            ruleType: 'BUY',
            priceThreshold: 20,
            quantity: 5, // Costs 100, only 10 available
        })

        expect(await ctx.autoTradeService.executeAutoTrade(rule)).toBeNull()
        expect((await getRule(rule.id))!.status).toBe('ACTIVE')

        // The transaction rolled back, so no trade row exists.
        const trades = await db.select().from(trade).where(eq(trade.portfolioId, portfolioId))
        expect(trades).toHaveLength(0)
    })

    test('two concurrent buys that together overdraw the balance: exactly one wins', async () => {
        const { portfolioId } = await seedPortfolio({ cashBalance: '100.00' })
        const { stockId } = await seedStock()
        await seedPrice(stockId, 20)

        // Each rule buys 4 @ 20 = 80. Only one is possible with 100 balance
        const ruleA = await ctx.autoTradeService.createAutoTrade({
            portfolioId, stockId, ruleType: 'BUY', priceThreshold: 20, quantity: 4,
        })
        const ruleB = await ctx.autoTradeService.createAutoTrade({
            portfolioId, stockId, ruleType: 'BUY', priceThreshold: 20, quantity: 4,
        })

        const results = await Promise.all([
            ctx.autoTradeService.executeAutoTrade(ruleA),
            ctx.autoTradeService.executeAutoTrade(ruleB),
        ])

        const executed = results.filter((r) => r !== null)
        expect(executed).toHaveLength(1)

        // One succeeded, other rolled back.
        const p = await ctx.portfolioService.getById(portfolioId)
        expect(parseFloat(p.cashBalance)).toBe(20)

        const trades = await db.select().from(trade).where(eq(trade.portfolioId, portfolioId))
        expect(trades).toHaveLength(1)

        const statuses = [(await getRule(ruleA.id))!.status, (await getRule(ruleB.id))!.status].sort()
        expect(statuses).toEqual(['ACTIVE', 'TRIGGERED'])
    })

    test('two concurrent sells that together oversell the position: exactly one wins', async () => {
        const { portfolioId } = await seedPortfolio({ cashBalance: '10000.00' })
        const { stockId } = await seedStock()
        await seedPrice(stockId, 100)
        await ctx.portfolioService.buy(portfolioId, stockId, 10, 100) // Hold 10

        // Each rule sells 8. Only one can fit in the 10-share position.
        const ruleA = await ctx.autoTradeService.createAutoTrade({
            portfolioId, stockId, ruleType: 'SELL', priceThreshold: 100, quantity: 8,
        })
        const ruleB = await ctx.autoTradeService.createAutoTrade({
            portfolioId, stockId, ruleType: 'SELL', priceThreshold: 100, quantity: 8,
        })

        const results = await Promise.all([
            ctx.autoTradeService.executeAutoTrade(ruleA),
            ctx.autoTradeService.executeAutoTrade(ruleB),
        ])

        expect(results.filter((r) => r !== null)).toHaveLength(1)

        // One succeeded, the other rolled back
        const holdings = await ctx.portfolioService.getHoldings(portfolioId)
        expect(Number(holdings.find((h) => h.stockId === stockId)?.quantity)).toBe(2)

        const statuses = [(await getRule(ruleA.id))!.status, (await getRule(ruleB.id))!.status].sort()
        expect(statuses).toEqual(['ACTIVE', 'TRIGGERED'])
    })
})

describe('AutoTradeService.expireAutoTrades', () => {
    test('expires rules past their expiry and leaves open-ended ones', async () => {
        const { portfolioId } = await seedPortfolio()
        const { stockId } = await seedStock()

        const expiring = await ctx.autoTradeService.createAutoTrade({
            portfolioId,
            stockId,
            ruleType: 'BUY',
            priceThreshold: 20,
            quantity: 1,
            expiresAt: new Date(Date.now() + 60_000),
        })
        const openEnded = await ctx.autoTradeService.createAutoTrade({
            portfolioId,
            stockId,
            ruleType: 'BUY',
            priceThreshold: 20,
            quantity: 1,
        })

        const count = await ctx.autoTradeService.expireAutoTrades(new Date(Date.now() + 120_000))
        expect(count).toBe(1)
        expect((await getRule(expiring.id))!.status).toBe('EXPIRED')
        expect((await getRule(openEnded.id))!.status).toBe('ACTIVE')
    })
})

describe('SyncService.checkAllAutoTrades', () => {
    test('triggers matching rules and skips unmatched ones', async () => {
        const { portfolioId } = await seedPortfolio({ cashBalance: '10000.00' })
        const { stockId: cheap } = await seedStock({ ticker: 'CHEAP' })
        const { stockId: pricey } = await seedStock({ ticker: 'PRICEY' })
        await seedPrice(cheap, 20)
        await seedPrice(pricey, 500)

        const firing = await ctx.autoTradeService.createAutoTrade({
            portfolioId,
            stockId: cheap,
            ruleType: 'BUY',
            priceThreshold: 20,
            quantity: 5,
        })
        const dormant = await ctx.autoTradeService.createAutoTrade({
            portfolioId,
            stockId: pricey,
            ruleType: 'BUY',
            priceThreshold: 100,
            quantity: 1,
        })

        await ctx.syncService.checkAllAutoTrades()

        expect((await getRule(firing.id))!.status).toBe('TRIGGERED')
        expect((await getRule(dormant.id))!.status).toBe('ACTIVE')
    })
})
