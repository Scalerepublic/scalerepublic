import { fetchQuotesInBatches, type StockDataClient, type StockDailyBar, type StockMeta, type StockQuote } from '../stock-data-client.ts'

import { createAlphaVantageClient } from './vantage.client.ts'

export class AlphaVantageStockClient implements StockDataClient {
    readonly source = 'alpha_vantage'
    private readonly client = createAlphaVantageClient()

    async getQuote(symbol: string): Promise<StockQuote | null> {
        try {
            const q = await this.client.getGlobalQuote(symbol)
            return { symbol: q.symbol, price: q.price, tradingDay: q.latestTradingDay }
        } catch {
            return null
        }
    }

    async getQuotes(symbols: string[]): Promise<StockQuote[]> {
        return fetchQuotesInBatches(this, symbols)
    }

    async getStockMeta(symbol: string): Promise<StockMeta | null> {
        try {
            const result = await this.client.searchSymbol(symbol)
            const match = result.bestMatches.find(m => m.symbol === symbol)
            if (!match) return null
            return { name: match.name, exchange: match.region, currency: match.currency, description: match.name }
        } catch {
            return null
        }
    }

    async getDailyBar(): Promise<StockDailyBar | null> {
        return null
    }
}
