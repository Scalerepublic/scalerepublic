import { beforeEach, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'

import { createApp } from '../../src/app.ts'
import { createAppContext } from '../../src/context.ts'
import { db } from '../../src/db/index.ts'
import { stockDailyBar } from '../../src/db/schema/stock/market.ts'
import { stock } from '../../src/db/schema/stock/stock.ts'
import { MockStockDataClient } from '../../src/modules/stockapi/mock-stock-client.ts'
import { resetDb } from '../helpers/db.ts'

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
})
