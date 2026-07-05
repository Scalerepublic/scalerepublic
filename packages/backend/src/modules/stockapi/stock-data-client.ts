import { readEnvNumber } from '../../lib/env-number.ts'

export type StockQuote = {
    symbol: string
    price: number
    tradingDay: Date
}

export type StockMeta = {
    name: string
    exchange: string
    currency: string
    description?: string
}

export type StockDailyBar = {
    symbol: string
    name: string
    tradingDate: string
    open: number
    high: number
    low: number
    close: number
}

export interface StockDataClient {
    readonly source: string
    getQuote(symbol: string): Promise<StockQuote | null>
    getQuotes(symbols: string[]): Promise<StockQuote[]>
    getStockMeta(symbol: string): Promise<StockMeta | null>
    getDailyBar(symbol: string, date?: Date): Promise<StockDailyBar | null>
}

const DEFAULT_QUOTE_BATCH_SIZE = 50
const DEFAULT_QUOTE_BATCH_DELAY_MS = 0

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export const fetchQuotesInBatches = async (
    client: Pick<StockDataClient, 'getQuote'>,
    symbols: string[],
): Promise<StockQuote[]> => {
    const batchSize = readEnvNumber('SYNC_QUOTE_BATCH_SIZE', DEFAULT_QUOTE_BATCH_SIZE)
    const batchDelayMs = readEnvNumber('SYNC_QUOTE_BATCH_DELAY_MS', DEFAULT_QUOTE_BATCH_DELAY_MS)
    const unique = [...new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean))]
    if (unique.length === 0) {
        return []
    }

    const quotes: StockQuote[] = []

    for (let offset = 0; offset < unique.length; offset += batchSize) {
        if (offset > 0 && batchDelayMs > 0) {
            await sleep(batchDelayMs)
        }

        const batch = unique.slice(offset, offset + batchSize)
        const results = await Promise.allSettled(batch.map((symbol) => client.getQuote(symbol)))

        for (let index = 0; index < results.length; index += 1) {
            const result = results[index]!
            const symbol = batch[index]!

            if (result.status === 'fulfilled') {
                if (result.value !== null) {
                    quotes.push(result.value)
                }
                continue
            }

            const message = result.reason instanceof Error ? result.reason.message : String(result.reason)
            console.warn(`[quotes] ${symbol} failed: ${message}`)
        }
    }

    return quotes
}
