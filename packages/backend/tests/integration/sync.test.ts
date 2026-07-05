import { beforeEach, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'

import { createApp } from '../../src/app.ts'
import { createAppContext } from '../../src/context.ts'
import { db } from '../../src/db/index.ts'
import { stockPrice } from '../../src/db/schema/stock/market.ts'
import { stock } from '../../src/db/schema/stock/stock.ts'
import { MockStockDataClient } from '../../src/modules/stockapi/mock-stock-client.ts'
import { resetDb } from '../helpers/db.ts'

const mockClient = new MockStockDataClient()
const ctx = createAppContext()
ctx.stockDataClient = mockClient
createApp(ctx)

beforeEach(async () => {
    await resetDb()
    mockClient.setMockStocks([])
})

describe('SyncService.syncOnce', () => {
    test('creates stock and price records for seeded tickers', async () => {
        mockClient.setMockStocks([
            { symbol: 'AAPL', name: 'Apple Inc.', price: 150 },
            { symbol: 'TSLA', name: 'Tesla Inc.', price: 200 },
        ])

        await ctx.syncService.syncOnce(['AAPL', 'TSLA'])

        const stocks = await db.select().from(stock)
        expect(stocks).toHaveLength(2)
        expect(stocks.map(s => s.ticker).sort()).toEqual(['AAPL', 'TSLA'])

        for (const s of stocks) {
            const prices = await db.select().from(stockPrice).where(eq(stockPrice.stockId, s.id))
            expect(prices).toHaveLength(1)
            const expected = s.ticker === 'AAPL' ? 150 : 200
            expect(parseFloat(prices[0]!.price)).toBe(expected)
        }
    })

    test('reuses existing stock record and appends a new price on re-sync', async () => {
        mockClient.setMockStocks([{ symbol: 'AAPL', name: 'Apple Inc.', price: 150 }])

        await ctx.syncService.syncOnce(['AAPL'])

        mockClient.setQuote('AAPL', 175)
        await ctx.syncService.syncOnce(['AAPL'])

        const stocks = await db.select().from(stock)
        expect(stocks).toHaveLength(1)

        const prices = await db.select().from(stockPrice).where(eq(stockPrice.stockId, stocks[0]!.id))
        expect(prices).toHaveLength(2)
        expect(prices.map(p => parseFloat(p.price)).sort((a, b) => a - b)).toEqual([150, 175])
    })

    test('skips ticker when meta is unavailable', async () => {
        mockClient.setQuote('UNKNOWN', 50)
        // No meta seeded — getStockMeta returns null

        await ctx.syncService.syncOnce(['UNKNOWN'])

        const stocks = await db.select().from(stock)
        expect(stocks).toHaveLength(0)
    })
})
