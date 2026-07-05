import { beforeEach, describe, expect, test } from 'bun:test'
import { asc, eq } from 'drizzle-orm'

import { createApp } from '../../src/app.ts'
import { createAppContext } from '../../src/context.ts'
import { db } from '../../src/db/index.ts'
import { stockDailyBar } from '../../src/db/schema/stock/market.ts'
import { stock } from '../../src/db/schema/stock/stock.ts'
import { MockStockDataClient } from '../../src/modules/stockapi/mock-stock-client.ts'
import { resetDb, seedDailyBar } from '../helpers/db.ts'

const mockClient = new MockStockDataClient()
const ctx = createAppContext()
ctx.stockDataClient = mockClient
createApp(ctx)

const seedImportedStock = async (ticker: string): Promise<string> => {
    const stockId = crypto.randomUUID()
    await db.insert(stock).values({
        id: stockId,
        ticker,
        companyName: ticker,
        exchange: 'UNKNOWN',
        currency: 'USD',
        isActive: true,
    })
    return stockId
}

beforeEach(async () => {
    await resetDb()
    mockClient.setMockStocks([])
})

describe('catalog backfill helpers', () => {
    test('listStocksNeedingNames returns only placeholder company names', async () => {
        await seedImportedStock('AAA')
        await seedImportedStock('BBB')
        const namedId = crypto.randomUUID()
        await db.insert(stock).values({
            id: namedId,
            ticker: 'CCC',
            companyName: 'C Corp',
            exchange: 'NASDAQ',
            currency: 'USD',
            isActive: true,
        })

        const pending = await ctx.stockService.listStocksNeedingNames(10)
        expect(pending.map((row) => row.ticker).sort()).toEqual(['AAA', 'BBB'])
    })

    test('applyStockNameFromApi updates placeholder names from daily bar', async () => {
        const stockId = await seedImportedStock('GME')
        mockClient.setMockStocks([{ symbol: 'GME', name: 'GameStop Corporation Common Stock', price: 27 }])

        const updated = await ctx.stockService.applyStockNameFromApi(stockId, 'GME')
        expect(updated).toBe(true)

        const [row] = await db.select().from(stock).where(eq(stock.id, stockId))
        expect(row?.companyName).toBe('GameStop Corporation Common Stock')
    })

    test('backfillStockHistory stores daily bars and metrics for imported tickers', async () => {
        const stockId = await seedImportedStock('GME')
        mockClient.setMockStocks([{ symbol: 'GME', name: 'GameStop Corporation Common Stock', price: 27 }])

        const { fetchesUsed } = await ctx.stockService.backfillStockHistory(stockId, 'GME', { maxFetches: 5 })
        expect(fetchesUsed).toBe(5)

        const bars = await db.select().from(stockDailyBar).where(eq(stockDailyBar.stockId, stockId))
        expect(bars.length).toBe(5)

        const [row] = await db.select().from(stock).where(eq(stock.id, stockId))
        expect(row?.companyName).toBe('GameStop Corporation Common Stock')
        expect(row?.periodChangePercent).not.toBeNull()
    })

    test('listStocksNeedingHistory prioritizes stocks with no bars', async () => {
        const emptyId = await seedImportedStock('AAA')
        const partialId = await seedImportedStock('BBB')
        await db.insert(stockDailyBar).values({
            id: crypto.randomUUID(),
            stockId: partialId,
            tradingDate: '2026-07-01',
            open: '10',
            high: '11',
            low: '9',
            close: '10.5',
            source: 'test',
        })

        const pending = await ctx.stockService.listStocksNeedingHistory(2)
        expect(pending[0]?.id).toBe(emptyId)
        expect(pending[1]?.id).toBe(partialId)
    })

    test('listStocks hides unbackfilled tickers unless searching', async () => {
        const coldId = await seedImportedStock('COLD')
        const warmId = await seedImportedStock('WARM')
        const today = new Date().toISOString().slice(0, 10)
        const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
        await seedDailyBar(warmId, { date: yesterday, close: 100 })
        await seedDailyBar(warmId, { date: today, close: 101 })

        const browse = await ctx.stockService.listStocks({ page: 1, limit: 24 })
        expect(browse.items.map((row) => row.ticker)).toEqual(['WARM'])
        expect(browse.total).toBe(1)

        const search = await ctx.stockService.listStocks({ q: 'O', page: 1, limit: 24 })
        expect(search.items.map((row) => row.ticker).sort()).toEqual(['COLD', 'WARM'])
        expect(search.total).toBe(2)

        void coldId
    })

    test('backfillStockHistory stores bars on requested calendar dates', async () => {
        const stockId = await seedImportedStock('GME')
        mockClient.setMockStocks([{ symbol: 'GME', name: 'GameStop Corporation Common Stock', price: 27 }])
        const originalGetDailyBar = mockClient.getDailyBar.bind(mockClient)
        mockClient.getDailyBar = async (symbol, date) => {
            const bar = await originalGetDailyBar(symbol, date)
            return bar ? { ...bar, tradingDate: '2020-01-01' } : null
        }

        await ctx.stockService.backfillStockHistory(stockId, 'GME', { maxFetches: 5 })

        const bars = await db
            .select({ tradingDate: stockDailyBar.tradingDate })
            .from(stockDailyBar)
            .where(eq(stockDailyBar.stockId, stockId))
            .orderBy(asc(stockDailyBar.tradingDate))

        expect(bars.length).toBe(5)
        for (const bar of bars) {
            expect(String(bar.tradingDate)).not.toBe('2020-01-01')
        }
    })
})
