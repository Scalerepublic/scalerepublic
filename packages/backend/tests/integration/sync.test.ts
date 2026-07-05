import { beforeEach, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'

import { createApp } from '../../src/app.ts'
import { createAppContext } from '../../src/context.ts'
import { db } from '../../src/db/index.ts'
import { stockPrice } from '../../src/db/schema/stock/market.ts'
import { stock } from '../../src/db/schema/stock/stock.ts'
import { MockStockDataClient } from '../../src/modules/stockapi/mock-stock-client.ts'
import { resetDb, seedDailyBar, seedPrice, seedStock } from '../helpers/db.ts'

const mockClient = new MockStockDataClient()
const ctx = createAppContext()
ctx.stockDataClient = mockClient
createApp(ctx)

beforeEach(async () => {
    await resetDb()
    mockClient.setMockStocks([])
})

describe('SyncService.syncOnce', () => {
    test('stores synthetic prices from cached daily bars', async () => {
        const aapl = await seedStock({ ticker: 'AAPL' })
        const tsla = await seedStock({ ticker: 'TSLA' })
        await seedDailyBar(aapl.stockId, { low: 140, high: 160, close: 150 })
        await seedDailyBar(tsla.stockId, { low: 190, high: 210, close: 200 })

        await ctx.syncService.syncOnce()

        for (const ticker of ['AAPL', 'TSLA']) {
            const [row] = await db.select().from(stock).where(eq(stock.ticker, ticker))
            const prices = await db.select().from(stockPrice).where(eq(stockPrice.stockId, row!.id))
            expect(prices).toHaveLength(1)
            const value = parseFloat(prices[0]!.price)
            if (ticker === 'AAPL') {
                expect(value).toBeGreaterThanOrEqual(140)
                expect(value).toBeLessThanOrEqual(160)
            } else {
                expect(value).toBeGreaterThanOrEqual(190)
                expect(value).toBeLessThanOrEqual(210)
            }
        }
    })

    test('appends a new synthetic price on re-sync', async () => {
        const { stockId } = await seedStock({ ticker: 'AAPL' })
        await seedDailyBar(stockId, { low: 140, high: 160, close: 150 })

        await ctx.syncService.syncOnce()
        await ctx.syncService.syncOnce()

        const prices = await db.select().from(stockPrice).where(eq(stockPrice.stockId, stockId))
        expect(prices).toHaveLength(2)
        for (const row of prices) {
            const value = parseFloat(row.price)
            expect(value).toBeGreaterThanOrEqual(140)
            expect(value).toBeLessThanOrEqual(160)
        }
    })

    test('falls back to jitter around the latest stored price when no daily bar exists', async () => {
        const { stockId } = await seedStock({ ticker: 'COIN' })
        await seedPrice(stockId, 100)

        await ctx.syncService.syncOnce()

        const prices = await db.select().from(stockPrice).where(eq(stockPrice.stockId, stockId))
        expect(prices).toHaveLength(2)
        const latest = parseFloat(prices.sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())[0]!.price)
        expect(latest).toBeGreaterThanOrEqual(99.5)
        expect(latest).toBeLessThanOrEqual(100.5)
    })

    test('skips when no eligible stocks exist', async () => {
        await seedStock({ ticker: 'VOID' })

        await ctx.syncService.syncOnce()

        const prices = await db.select().from(stockPrice)
        expect(prices).toHaveLength(0)
    })

    test('batch sync stores synthetic prices for every eligible stock', async () => {
        const aapl = await seedStock({ ticker: 'AAPL' })
        const tsla = await seedStock({ ticker: 'TSLA' })
        const empty = await seedStock({ ticker: 'VOID' })
        await seedDailyBar(aapl.stockId, { low: 140, high: 160, close: 150 })
        await seedDailyBar(tsla.stockId, { low: 190, high: 210, close: 200 })

        await ctx.syncService.syncOnce()

        const aaplPrices = await db.select().from(stockPrice).where(eq(stockPrice.stockId, aapl.stockId))
        const tslaPrices = await db.select().from(stockPrice).where(eq(stockPrice.stockId, tsla.stockId))
        const voidPrices = await db.select().from(stockPrice).where(eq(stockPrice.stockId, empty.stockId))

        expect(aaplPrices).toHaveLength(1)
        expect(tslaPrices).toHaveLength(1)
        expect(voidPrices).toHaveLength(0)
    })
})
