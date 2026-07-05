import type { DbConnection } from '../../db/index.ts'

import type { StockDataClient } from './stock-data-client.ts'
import type { StockQuoteClient } from './stock-quote-client.ts'
import { SyntheticQuoteClient } from './synthetic-quote-client.ts'
import { UniStockClient, type UniApiSubfetch } from './uni-stock-client.ts'
import { AlphaVantageStockClient } from './vantage/vantage-stock-client.ts'

export type StockQuoteClientOptions = {
    uniApiSubfetch?: UniApiSubfetch
    uniApiBaseUrl?: string
}

export const createStockQuoteClient = (
    db: DbConnection,
    marketDataClient: StockDataClient,
    options: StockQuoteClientOptions = {},
): StockQuoteClient => {
    const provider = process.env['STOCK_QUOTE_PROVIDER'] ?? 'synthetic'

    if (provider === 'synthetic') {
        return new SyntheticQuoteClient(db)
    }

    if (provider === 'uni') {
        return marketDataClient as StockQuoteClient
    }

    if (provider === 'alphavantage') {
        return marketDataClient as StockQuoteClient
    }

    if (provider === 'uni-direct') {
        return new UniStockClient(undefined, options.uniApiBaseUrl, options.uniApiSubfetch)
    }

    if (provider === 'alphavantage-direct') {
        return new AlphaVantageStockClient()
    }

    throw new Error(`Unknown STOCK_QUOTE_PROVIDER: ${provider}`)
}
