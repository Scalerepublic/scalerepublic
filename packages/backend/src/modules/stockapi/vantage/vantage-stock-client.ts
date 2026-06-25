import type { StockDataClient, StockDailyBar, StockMeta, StockQuote } from '../stock-data-client.ts'

import { createAlphaVantageClient } from './vantage.client.ts'

export class AlphaVantageStockClient implements StockDataClient {
    readonly source = 'alpha_vantage'
    private readonly client = createAlphaVantageClient()

    async getQuote(symbol: string): Promise<StockQuote> {
        const q = await this.client.getGlobalQuote(symbol)
        return { symbol: q.symbol, price: q.price, tradingDay: q.latestTradingDay }
    }

    async getStockMeta(symbol: string): Promise<StockMeta | null> {
        const result = await this.client.searchSymbol(symbol)
        const match = result.bestMatches.find(m => m.symbol === symbol)
        if (!match) return null
        return { name: match.name, exchange: match.region, currency: match.currency, description: match.name }
    }

    async getDailyBar(): Promise<StockDailyBar | null> {
        return null
    }
}
