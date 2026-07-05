import { and, desc, eq, inArray, ne, sql } from 'drizzle-orm'

import type { DbConnection } from '../../db/index.ts'
import { stock, stockDailyBar, stockPrice } from '../../db/schema/stock/index.ts'
import {
    DEBUG_MARKET_CRASH_SOURCE,
    DEBUG_MARKET_PRICE_SOURCE,
} from '../../lib/market-debug.ts'

import type { StockQuote } from './stock-data-client.ts'
import type { StockQuoteClient } from './stock-quote-client.ts'

export const SYNTHETIC_QUOTE_SOURCE = 'synthetic'

const computeSyntheticPrice = (high: number, low: number, close: number): number => {
    const spread = high - low
    return spread > 0 ? low + Math.random() * spread : close
}

const computeSyntheticPriceFromLatest = (latestPrice: number): number =>
    latestPrice * (0.995 + Math.random() * 0.01)

export class SyntheticQuoteClient implements StockQuoteClient {
    readonly source = SYNTHETIC_QUOTE_SOURCE

    constructor(private readonly db: DbConnection) {}

    async getQuote(symbol: string): Promise<StockQuote | null> {
        const quotes = await this.getQuotes([symbol])
        return quotes[0] ?? null
    }

    async getQuotes(symbols: string[]): Promise<StockQuote[]> {
        const normalized = [...new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean))]
        if (normalized.length === 0) {
            return []
        }

        const tradingDay = new Date()
        const symbolFilter = inArray(stock.ticker, normalized)

        const barRows = await this.db
            .selectDistinctOn([stockDailyBar.stockId], {
                ticker: stock.ticker,
                high: stockDailyBar.high,
                low: stockDailyBar.low,
                close: stockDailyBar.close,
            })
            .from(stockDailyBar)
            .innerJoin(stock, eq(stock.id, stockDailyBar.stockId))
            .where(and(
                eq(stock.isActive, true),
                symbolFilter,
                sql`${stockDailyBar.close}::numeric > 0`,
            ))
            .orderBy(stockDailyBar.stockId, desc(stockDailyBar.tradingDate))

        const quotes: StockQuote[] = []
        const coveredTickers = new Set<string>()

        for (const row of barRows) {
            const price = computeSyntheticPrice(
                parseFloat(row.high),
                parseFloat(row.low),
                parseFloat(row.close),
            )
            if (price <= 0) continue

            coveredTickers.add(row.ticker)
            quotes.push({ symbol: row.ticker, price, tradingDay })
        }

        const priceRows = await this.db
            .selectDistinctOn([stockPrice.stockId], {
                ticker: stock.ticker,
                price: stockPrice.price,
            })
            .from(stockPrice)
            .innerJoin(stock, eq(stock.id, stockPrice.stockId))
            .where(and(
                eq(stock.isActive, true),
                symbolFilter,
                sql`${stockPrice.price}::numeric > 0`,
                ne(stockPrice.source, DEBUG_MARKET_PRICE_SOURCE),
                ne(stockPrice.source, DEBUG_MARKET_CRASH_SOURCE),
            ))
            .orderBy(stockPrice.stockId, desc(stockPrice.recordedAt))

        for (const row of priceRows) {
            if (coveredTickers.has(row.ticker)) continue

            const latestPrice = parseFloat(row.price)
            if (!Number.isFinite(latestPrice) || latestPrice <= 0) continue

            const price = computeSyntheticPriceFromLatest(latestPrice)
            if (price <= 0) continue

            quotes.push({ symbol: row.ticker, price, tradingDay })
        }

        return quotes
    }
}
