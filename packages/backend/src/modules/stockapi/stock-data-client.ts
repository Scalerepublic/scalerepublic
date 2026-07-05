import type { StockQuoteClient } from './stock-quote-client.ts'

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

export interface StockDataClient extends StockQuoteClient {
    getStockMeta(symbol: string): Promise<StockMeta | null>
    getDailyBar(symbol: string, date?: Date): Promise<StockDailyBar | null>
}
