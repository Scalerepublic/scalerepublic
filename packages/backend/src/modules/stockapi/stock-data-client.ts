import { UniStockClient } from './uni-stock-client.ts'
import { AlphaVantageStockClient } from './vantage-stock-client.ts'

export type StockQuote = {
    symbol: string
    price: number
    tradingDay: Date
}

export type StockMeta = {
    name: string
    exchange: string
    currency: string
}

export interface StockDataClient {
    readonly source: string
    getQuote(symbol: string): Promise<StockQuote>
    getStockMeta(symbol: string): Promise<StockMeta | null>
}

export const createStockDataClient = (): StockDataClient => {
    const provider = process.env['STOCK_API_PROVIDER'] ?? 'alphavantage'
    return provider === 'uni' ? new UniStockClient() : new AlphaVantageStockClient()
}
