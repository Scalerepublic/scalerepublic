import type { StockDataClient, StockDailyBar, StockMeta, StockQuote } from './stock-data-client.ts'

type StockSeed = {
    symbol: string
    name: string
    price: number
    exchange?: string
    currency?: string
}

export class MockStockDataClient implements StockDataClient {
    readonly source = 'mock'

    private readonly quotes = new Map<string, number>()
    private readonly meta = new Map<string, StockMeta>()

    static withMockStocks(stocks: StockSeed[]): MockStockDataClient {
        const client = new MockStockDataClient()
        client.setMockStocks(stocks)
        return client
    }

    setMockStocks(stocks: StockSeed[]): void {
        this.quotes.clear()
        this.meta.clear()
        for (const s of stocks) {
            this.setQuote(s.symbol, s.price)
            this.setMeta(s.symbol, {
                name: s.name,
                exchange: s.exchange ?? 'NASDAQ',
                currency: s.currency ?? 'USD',
            })
        }
    }

    setQuote(symbol: string, price: number): void {
        this.quotes.set(symbol, price)
    }

    setMeta(symbol: string, meta: StockMeta): void {
        this.meta.set(symbol, meta)
    }

    async getQuote(symbol: string): Promise<StockQuote> {
        const price = this.quotes.get(symbol)
        if (price === undefined) throw new Error(`MockStockDataClient: no quote seeded for ${symbol}`)
        return { symbol, price, tradingDay: new Date() }
    }

    async getStockMeta(symbol: string): Promise<StockMeta | null> {
        return this.meta.get(symbol) ?? null
    }

    async getDailyBar(symbol: string, date?: Date): Promise<StockDailyBar | null> {
        const price = this.quotes.get(symbol)
        const meta = this.meta.get(symbol)
        if (price === undefined || meta === undefined) return null

        const tradingDate = (date ?? new Date()).toISOString().slice(0, 10)
        const spread = price * 0.02
        return {
            symbol,
            name: meta.name,
            tradingDate,
            open: price - spread * 0.5,
            low: price - spread,
            high: price + spread,
            close: price,
        }
    }
}
