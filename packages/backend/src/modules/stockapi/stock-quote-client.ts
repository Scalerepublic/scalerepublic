import type { StockQuote } from './stock-data-client.ts'

export interface StockQuoteClient {
    readonly source: string
    getQuote(symbol: string): Promise<StockQuote | null>
    getQuotes(symbols: string[]): Promise<StockQuote[]>
}
