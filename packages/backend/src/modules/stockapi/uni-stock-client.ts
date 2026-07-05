import { z } from 'zod'

import type { StockDataClient, StockDailyBar, StockMeta, StockQuote } from './stock-data-client.ts'
import { UNI_API_PROXY_BASE_URL } from '../../lib/uni-api-proxy.ts'

const DailyResponseSchema = z.object({
    stock_symbol: z.string(),
    stock_name: z.string().transform((value) => value.trim()),
    stock_open: z.coerce.number(),
    stock_low: z.coerce.number(),
    stock_high: z.coerce.number(),
    stock_close: z.coerce.number(),
    date: z.string(),
})

export type UniApiSubfetch = (
    input: string | URL | Request,
    init?: RequestInit,
) => Promise<Response>

export class UniStockClient implements StockDataClient {
    readonly source = 'uni_api'
    private readonly token: string
    private readonly baseUrl: string
    private readonly subfetch: UniApiSubfetch | undefined

    constructor(token?: string, baseUrl?: string, subfetch?: UniApiSubfetch) {
        const t = token ?? process.env['UNI_API_TOKEN']
        if (t === undefined || t === '') throw new Error('UNI_API_TOKEN env var is required for the uni stock client')
        this.token = t

        if (subfetch !== undefined) {
            const proxySecret = process.env['UNI_API_PROXY_SECRET']?.trim()
            if (proxySecret === undefined || proxySecret === '') {
                throw new Error('UNI_API_PROXY_SECRET env var is required when using the uni API proxy binding')
            }
            const u = baseUrl ?? process.env['UNI_API_BASE_URL'] ?? UNI_API_PROXY_BASE_URL
            this.baseUrl = this.normalizeBaseUrl(u)
        } else {
            const u = baseUrl ?? process.env['UNI_API_BASE_URL']
            if (u === undefined || u === '') throw new Error('UNI_API_BASE_URL env var is required')
            this.baseUrl = this.normalizeBaseUrl(u)
        }
        this.subfetch = subfetch
    }

    private resolveFetch(): UniApiSubfetch {
        return this.subfetch ?? fetch
    }

    private normalizeBaseUrl(url: string): string {
        const trimmed = url.replace(/\/$/, '')
        try {
            const parsed = new URL(trimmed)
            const isIpv4 = /^\d{1,3}(\.\d{1,3}){3}$/.test(parsed.hostname)
            if (isIpv4 && parsed.protocol === 'https:') {
                parsed.protocol = 'http:'
                return parsed.toString().replace(/\/$/, '')
            }
        } catch {
            return trimmed
        }
        return trimmed
    }

    private redactRequestUrl(url: URL): string {
        const copy = new URL(url.toString())
        copy.searchParams.set('token', '[redacted]')
        return copy.toString()
    }

    private proxyRequestHeaders(): Record<string, string> {
        const secret = process.env['UNI_API_PROXY_SECRET']?.trim()
        if (secret === undefined || secret === '') {
            return {}
        }
        return { 'X-Uni-Proxy-Secret': secret }
    }

    private async get(path: string, query: Record<string, string> = {}): Promise<unknown> {
        const url = new URL(`${this.baseUrl}${path}`)
        for (const [key, value] of Object.entries(query)) {
            url.searchParams.set(key, value)
        }
        url.searchParams.set('token', this.token)
        const transport = this.subfetch !== undefined ? 'service-binding' : 'direct'
        console.log(`[uniapi] GET ${this.redactRequestUrl(url)} via ${transport}`)
        const res = await this.resolveFetch()(url.toString(), { headers: this.proxyRequestHeaders() })
        if (!res.ok) {
            const body = await res.text()
            const detail = body.length > 0 ? `: ${body.slice(0, 500)}` : ''
            throw new Error(`Uni API error: ${res.status} ${res.statusText}${detail}`)
        }
        return res.json()
    }

    async getQuote(symbol: string): Promise<StockQuote> {
        const raw = await this.get(`/stocks/${symbol}`)
        const data = DailyResponseSchema.parse(raw)
        return {
            symbol: data.stock_symbol,
            price: data.stock_close,
            tradingDay: new Date(data.date),
        }
    }

    private formatDateParam(date: Date): string {
        return date.toISOString().slice(0, 10)
    }

    async getDailyBar(symbol: string, date?: Date): Promise<StockDailyBar | null> {
        try {
            const query: Record<string, string> =
                date === undefined ? {} : { date: this.formatDateParam(date) }
            const raw = await this.get(`/stocks/${symbol}`, query)
            const data = DailyResponseSchema.parse(raw)
            return {
                symbol: data.stock_symbol,
                name: data.stock_name,
                tradingDate: date !== undefined ? this.formatDateParam(date) : data.date,
                open: data.stock_open,
                high: data.stock_high,
                low: data.stock_low,
                close: data.stock_close,
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err)
            console.warn(`[uniapi] getDailyBar ${symbol} failed: ${message}`)
            return null
        }
    }

    async getStockMeta(symbol: string): Promise<StockMeta | null> {
        try {
            const raw = await this.get(`/stocks/${symbol}`)
            const data = DailyResponseSchema.parse(raw)
            return {
                name: data.stock_name,
                exchange: 'UNKNOWN',
                currency: 'USD',
                description: data.stock_name,
            }
        } catch {
            return null
        }
    }
}
