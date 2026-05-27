import { z } from 'zod'

import type { StockDataClient, StockMeta, StockQuote } from './stock-data-client.ts'

const BASE_URL = process.env['UNI_API_BASE_URL']
if (BASE_URL === undefined || BASE_URL === '') throw new Error('UNI_API_BASE_URL env var is required — set it to the university stock API base URL')

// Endpoint currently unused because of the rate limit
// const PriceResponseSchema = z.object({
//     stock_symbol: z.string(),
//     stock_name: z.string(),
//     stock_price: z.number(),
// })

const DailyResponseSchema = z.object({
    stock_symbol: z.string(),
    stock_name: z.string(),
    stock_open: z.number(),
    stock_low: z.number(),
    stock_high: z.number(),
    stock_close: z.number(),
    date: z.string(),
})

export class UniStockClient implements StockDataClient {
    readonly source = 'uni_api'
    private readonly token: string

    constructor(token?: string) {
        const t = token ?? process.env['UNI_API_TOKEN']
        if (t === undefined || t === '') throw new Error('UNI_API_TOKEN env var is required for the uni stock client')
        this.token = t
    }

    private async get(path: string): Promise<unknown> {
        console.log(`[uniapi] GET ${BASE_URL}${path}?token=${this.token}`)
        const url = new URL(`${BASE_URL}${path}`)
        url.searchParams.set('token', this.token)
        const res = await fetch(url.toString())
        if (!res.ok) throw new Error(`Uni API error: ${res.status} ${res.statusText}`)
        return res.json()
    }

    async getQuote(symbol: string): Promise<StockQuote> {
        // The /price endpoint is rate-limited to 1 request per hor per symbol which is
        // atrocious for testing. Since it just returns a random number between that days
        // high and low, we just replicate it here.
        const raw = await this.get(`/stocks/${symbol}`)
        const data = DailyResponseSchema.parse(raw)
        const price = data.stock_low + Math.random() * (data.stock_high - data.stock_low)
        return { symbol: data.stock_symbol, price, tradingDay: new Date(data.date) }

        // Original price endpoint. We may want to enable this in production
        // const raw = await this.get(`/stocks/${symbol}/price`)
        // const data = PriceResponseSchema.parse(raw)
        // return { symbol: data.stock_symbol, price: data.stock_price, tradingDay: new Date() }
    }

    async getStockMeta(symbol: string): Promise<StockMeta | null> {
        try {
            const raw = await this.get(`/stocks/${symbol}`)
            const data = DailyResponseSchema.parse(raw)
            return { name: data.stock_name, exchange: 'UNKNOWN', currency: 'USD' }
        } catch {
            // Fall back to a placeholder rather than blocking stock creation
            return { name: symbol, exchange: 'UNKNOWN', currency: 'USD' }
        }
    }
}
