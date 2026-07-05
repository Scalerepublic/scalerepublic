import { readEnvNumber } from '../../lib/env-number.ts'

import type { StockQuote } from './stock-data-client.ts'
import type { StockQuoteClient } from './stock-quote-client.ts'

export const DEFAULT_QUOTE_BATCH_SIZE = 50
export const DEFAULT_QUOTE_BATCH_DELAY_MS = 0

export type QuoteBatchOptions = {
    batchSize: number
    batchDelayMs: number
}

export const readQuoteBatchOptions = (): QuoteBatchOptions => ({
    batchSize: readEnvNumber('SYNC_QUOTE_BATCH_SIZE', DEFAULT_QUOTE_BATCH_SIZE),
    batchDelayMs: readEnvNumber('SYNC_QUOTE_BATCH_DELAY_MS', DEFAULT_QUOTE_BATCH_DELAY_MS),
})

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export const fetchQuotesInBatches = async (
    client: StockQuoteClient,
    symbols: string[],
    options: QuoteBatchOptions,
): Promise<StockQuote[]> => {
    const unique = [...new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean))]
    if (unique.length === 0) {
        return []
    }

    const quotes: StockQuote[] = []

    for (let offset = 0; offset < unique.length; offset += options.batchSize) {
        if (offset > 0 && options.batchDelayMs > 0) {
            await sleep(options.batchDelayMs)
        }

        const batch = unique.slice(offset, offset + options.batchSize)
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
