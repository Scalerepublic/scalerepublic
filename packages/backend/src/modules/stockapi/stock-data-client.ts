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
