import {
    DailyAdjustedSchema,
    DailySchema,
    GlobalQuoteSchema,
    IndexDataSchema,
    IntradaySchema,
    MarketStatusSchema,
    MonthlyAdjustedSchema,
    MonthlySchema,
    SymbolSearchSchema,
    WeeklyAdjustedSchema,
    WeeklySchema,
    type DailyAdjusted,
    type Daily,
    type GlobalQuote,
    type IndexData,
    type IndexInterval,
    type IndexSymbol,
    type Intraday,
    type IntradayInterval,
    type MarketStatus,
    type MonthlyAdjusted,
    type Monthly,
    type OutputSize,
    type SymbolSearch,
    type WeeklyAdjusted,
    type Weekly,
} from './stockapi.schema.ts'

const BASE_URL = 'https://www.alphavantage.co/query'

export class AlphaVantageClient {
    private readonly apiKey: string

    constructor(apiKey: string) {
        this.apiKey = apiKey
    }

    private async request<T>(params: Record<string, string>): Promise<T> {
        const url = new URL(BASE_URL)
        url.searchParams.set('apikey', this.apiKey)
        for (const [key, value] of Object.entries(params)) {
            url.searchParams.set(key, value)
        }

        const res = await fetch(url.toString())
        if (!res.ok) {
            throw new Error(`Alpha Vantage request failed: ${res.status} ${res.statusText}`)
        }

        return res.json() as Promise<T>
    }

    async getGlobalQuote(symbol: string): Promise<GlobalQuote> {
        const raw = await this.request({ function: 'GLOBAL_QUOTE', symbol })
        return GlobalQuoteSchema.parse(raw)
    }

    async getIntraday(
        symbol: string,
        interval: IntradayInterval,
        options?: {
            adjusted?: boolean
            extendedHours?: boolean
            month?: string
            outputSize?: OutputSize
        },
    ): Promise<Intraday> {
        const raw = await this.request({
            function: 'TIME_SERIES_INTRADAY',
            symbol,
            interval,
            ...(options?.adjusted !== undefined && { adjusted: String(options.adjusted) }),
            ...(options?.extendedHours !== undefined && { extended_hours: String(options.extendedHours) }),
            ...(options?.month && { month: options.month }),
            ...(options?.outputSize && { outputsize: options.outputSize }),
        })
        return IntradaySchema.parse(raw)
    }

    async getDaily(symbol: string, outputSize?: OutputSize): Promise<Daily> {
        const raw = await this.request({
            function: 'TIME_SERIES_DAILY',
            symbol,
            ...(outputSize && { outputsize: outputSize }),
        })
        return DailySchema.parse(raw)
    }

    async getDailyAdjusted(symbol: string, outputSize?: OutputSize): Promise<DailyAdjusted> {
        const raw = await this.request({
            function: 'TIME_SERIES_DAILY_ADJUSTED',
            symbol,
            ...(outputSize && { outputsize: outputSize }),
        })
        return DailyAdjustedSchema.parse(raw)
    }

    async getWeekly(symbol: string): Promise<Weekly> {
        const raw = await this.request({ function: 'TIME_SERIES_WEEKLY', symbol })
        return WeeklySchema.parse(raw)
    }

    async getWeeklyAdjusted(symbol: string): Promise<WeeklyAdjusted> {
        const raw = await this.request({ function: 'TIME_SERIES_WEEKLY_ADJUSTED', symbol })
        return WeeklyAdjustedSchema.parse(raw)
    }

    async getMonthly(symbol: string): Promise<Monthly> {
        const raw = await this.request({ function: 'TIME_SERIES_MONTHLY', symbol })
        return MonthlySchema.parse(raw)
    }

    async getMonthlyAdjusted(symbol: string): Promise<MonthlyAdjusted> {
        const raw = await this.request({ function: 'TIME_SERIES_MONTHLY_ADJUSTED', symbol })
        return MonthlyAdjustedSchema.parse(raw)
    }

    async searchSymbol(keywords: string): Promise<SymbolSearch> {
        const raw = await this.request({ function: 'SYMBOL_SEARCH', keywords })
        return SymbolSearchSchema.parse(raw)
    }

    async getMarketStatus(): Promise<MarketStatus> {
        const raw = await this.request({ function: 'MARKET_STATUS' })
        return MarketStatusSchema.parse(raw)
    }

    async getIndexData(
        symbol: IndexSymbol,
        interval: IndexInterval,
    ): Promise<IndexData> {
        const raw = await this.request({ function: 'INDEX_DATA', symbol, interval })
        return IndexDataSchema.parse(raw)
    }
}

export function createAlphaVantageClient(apiKey?: string): AlphaVantageClient {
    const key = apiKey ?? process.env['ALPHAVANTAGE_API_KEY']
    if (!key) {
        throw new Error('Alpha Vantage API key is required. Set ALPHAVANTAGE_API_KEY env var or pass it explicitly.')
    }
    return new AlphaVantageClient(key)
}
