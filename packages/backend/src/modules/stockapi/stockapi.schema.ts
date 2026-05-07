import { z } from 'zod'

// ─── Coerce helpers ──────────────────────────────────────────────────────────

const num = z.string().transform(Number)
const int = z.string().transform((s) => parseInt(s, 10))
const pct = z.string().transform((s) => parseFloat(s.replace('%', '').trim()))
// Date-only strings (YYYY-MM-DD) — append time so Date parses in local tz
const dateOnly = z.string().transform((s) => new Date(`${s}T00:00:00`))
// Datetime strings (YYYY-MM-DD HH:MM:SS)
const dateTime = z.string().transform((s) => new Date(s.replace(' ', 'T')))

// ─── Bar output types ────────────────────────────────────────────────────────

export type OhlcvBar = {
    date: Date
    open: number
    high: number
    low: number
    close: number
    volume: number
}

export type OhlcvAdjustedBar = {
    date: Date
    open: number
    high: number
    low: number
    close: number
    adjustedClose: number
    volume: number
    dividendAmount: number
    splitCoefficient: number
}

export type OhlcvWeeklyAdjustedBar = {
    date: Date
    open: number
    high: number
    low: number
    close: number
    adjustedClose: number
    volume: number
    dividendAmount: number
}

export type OhlcIndexBar = {
    date: Date
    open: number
    high: number
    low: number
    close: number
}

// ─── Internal raw schemas ────────────────────────────────────────────────────

const RawOhlcvSchema = z.object({
    '1. open': z.string(),
    '2. high': z.string(),
    '3. low': z.string(),
    '4. close': z.string(),
    '5. volume': z.string(),
})

const RawOhlcvAdjustedSchema = z.object({
    '1. open': z.string(),
    '2. high': z.string(),
    '3. low': z.string(),
    '4. close': z.string(),
    '5. adjusted close': z.string(),
    '6. volume': z.string(),
    '7. dividend amount': z.string(),
    '8. split coefficient': z.string(),
})

const RawOhlcvWeeklyAdjustedSchema = z.object({
    '1. open': z.string(),
    '2. high': z.string(),
    '3. low': z.string(),
    '4. close': z.string(),
    '5. adjusted close': z.string(),
    '6. volume': z.string(),
    '7. dividend amount': z.string(),
})

const RawOhlcIndexSchema = z.object({
    '1. open': z.string(),
    '2. high': z.string(),
    '3. low': z.string(),
    '4. close': z.string(),
})

// ─── Record-to-array converters ──────────────────────────────────────────────

type RawOhlcv = z.infer<typeof RawOhlcvSchema>
type RawOhlcvAdjusted = z.infer<typeof RawOhlcvAdjustedSchema>
type RawOhlcvWeeklyAdjusted = z.infer<typeof RawOhlcvWeeklyAdjustedSchema>
type RawOhlcIndex = z.infer<typeof RawOhlcIndexSchema>

function toOhlcvArray(record: Record<string, RawOhlcv>, parseDt = false): OhlcvBar[] {
    return Object.entries(record)
        .map(([d, bar]) => ({
            date: parseDt ? new Date(d.replace(' ', 'T')) : new Date(`${d}T00:00:00`),
            open: Number(bar['1. open']),
            high: Number(bar['2. high']),
            low: Number(bar['3. low']),
            close: Number(bar['4. close']),
            volume: Number(bar['5. volume']),
        }))
        .sort((a, b) => b.date.getTime() - a.date.getTime())
}

function toOhlcvAdjustedArray(record: Record<string, RawOhlcvAdjusted>): OhlcvAdjustedBar[] {
    return Object.entries(record)
        .map(([d, bar]) => ({
            date: new Date(`${d}T00:00:00`),
            open: Number(bar['1. open']),
            high: Number(bar['2. high']),
            low: Number(bar['3. low']),
            close: Number(bar['4. close']),
            adjustedClose: Number(bar['5. adjusted close']),
            volume: Number(bar['6. volume']),
            dividendAmount: Number(bar['7. dividend amount']),
            splitCoefficient: Number(bar['8. split coefficient']),
        }))
        .sort((a, b) => b.date.getTime() - a.date.getTime())
}

function toOhlcvWeeklyAdjustedArray(record: Record<string, RawOhlcvWeeklyAdjusted>): OhlcvWeeklyAdjustedBar[] {
    return Object.entries(record)
        .map(([d, bar]) => ({
            date: new Date(`${d}T00:00:00`),
            open: Number(bar['1. open']),
            high: Number(bar['2. high']),
            low: Number(bar['3. low']),
            close: Number(bar['4. close']),
            adjustedClose: Number(bar['5. adjusted close']),
            volume: Number(bar['6. volume']),
            dividendAmount: Number(bar['7. dividend amount']),
        }))
        .sort((a, b) => b.date.getTime() - a.date.getTime())
}

function toOhlcIndexArray(record: Record<string, RawOhlcIndex>): OhlcIndexBar[] {
    return Object.entries(record)
        .map(([d, bar]) => ({
            date: new Date(`${d}T00:00:00`),
            open: Number(bar['1. open']),
            high: Number(bar['2. high']),
            low: Number(bar['3. low']),
            close: Number(bar['4. close']),
        }))
        .sort((a, b) => b.date.getTime() - a.date.getTime())
}

// ─── GLOBAL_QUOTE ────────────────────────────────────────────────────────────

export const GlobalQuoteSchema = z.object({
    'Global Quote': z.object({
        '01. symbol': z.string(),
        '02. open': num,
        '03. high': num,
        '04. low': num,
        '05. price': num,
        '06. volume': int,
        '07. latest trading day': dateOnly,
        '08. previous close': num,
        '09. change': num,
        '10. change percent': pct,
    }),
}).transform((d) => {
    const q = d['Global Quote']
    return {
        symbol: q['01. symbol'],
        open: q['02. open'],
        high: q['03. high'],
        low: q['04. low'],
        price: q['05. price'],
        volume: q['06. volume'],
        latestTradingDay: q['07. latest trading day'],
        previousClose: q['08. previous close'],
        change: q['09. change'],
        changePercent: q['10. change percent'],
    }
})

export type GlobalQuote = z.infer<typeof GlobalQuoteSchema>

// ─── TIME_SERIES_INTRADAY ────────────────────────────────────────────────────

export const IntradaySchema = z.object({
    'Meta Data': z.object({
        '1. Information': z.string(),
        '2. Symbol': z.string(),
        '3. Last Refreshed': dateTime,
        '4. Interval': z.string(),
        '5. Output Size': z.string(),
        '6. Time Zone': z.string(),
    }),
}).catchall(z.record(z.string(), RawOhlcvSchema)).transform((d) => {
    const interval = d['Meta Data']['4. Interval']
    const seriesKey = `Time Series (${interval})`
    const raw = d[seriesKey] ?? {}
    return {
        meta: {
            information: d['Meta Data']['1. Information'],
            symbol: d['Meta Data']['2. Symbol'],
            lastRefreshed: d['Meta Data']['3. Last Refreshed'],
            interval,
            outputSize: d['Meta Data']['5. Output Size'],
            timeZone: d['Meta Data']['6. Time Zone'],
        },
        bars: toOhlcvArray(raw, true),
    }
})

export type Intraday = z.infer<typeof IntradaySchema>

// ─── TIME_SERIES_DAILY ───────────────────────────────────────────────────────

const DailyMetaSchema = z.object({
    '1. Information': z.string(),
    '2. Symbol': z.string(),
    '3. Last Refreshed': dateOnly,
    '4. Output Size': z.string(),
    '5. Time Zone': z.string(),
})

export const DailySchema = z.object({
    'Meta Data': DailyMetaSchema,
    'Time Series (Daily)': z.record(z.string(), RawOhlcvSchema),
}).transform((d) => ({
    meta: {
        information: d['Meta Data']['1. Information'],
        symbol: d['Meta Data']['2. Symbol'],
        lastRefreshed: d['Meta Data']['3. Last Refreshed'],
        outputSize: d['Meta Data']['4. Output Size'],
        timeZone: d['Meta Data']['5. Time Zone'],
    },
    bars: toOhlcvArray(d['Time Series (Daily)']),
}))

export type Daily = z.infer<typeof DailySchema>

// ─── TIME_SERIES_DAILY_ADJUSTED ──────────────────────────────────────────────

export const DailyAdjustedSchema = z.object({
    'Meta Data': DailyMetaSchema,
    'Time Series (Daily)': z.record(z.string(), RawOhlcvAdjustedSchema),
}).transform((d) => ({
    meta: {
        information: d['Meta Data']['1. Information'],
        symbol: d['Meta Data']['2. Symbol'],
        lastRefreshed: d['Meta Data']['3. Last Refreshed'],
        outputSize: d['Meta Data']['4. Output Size'],
        timeZone: d['Meta Data']['5. Time Zone'],
    },
    bars: toOhlcvAdjustedArray(d['Time Series (Daily)']),
}))

export type DailyAdjusted = z.infer<typeof DailyAdjustedSchema>

// ─── TIME_SERIES_WEEKLY ──────────────────────────────────────────────────────

const WeeklyMetaSchema = z.object({
    '1. Information': z.string(),
    '2. Symbol': z.string(),
    '3. Last Refreshed': dateOnly,
    '4. Time Zone': z.string(),
})

export const WeeklySchema = z.object({
    'Meta Data': WeeklyMetaSchema,
    'Weekly Time Series': z.record(z.string(), RawOhlcvSchema),
}).transform((d) => ({
    meta: {
        information: d['Meta Data']['1. Information'],
        symbol: d['Meta Data']['2. Symbol'],
        lastRefreshed: d['Meta Data']['3. Last Refreshed'],
        timeZone: d['Meta Data']['4. Time Zone'],
    },
    bars: toOhlcvArray(d['Weekly Time Series']),
}))

export type Weekly = z.infer<typeof WeeklySchema>

// ─── TIME_SERIES_WEEKLY_ADJUSTED ─────────────────────────────────────────────

export const WeeklyAdjustedSchema = z.object({
    'Meta Data': WeeklyMetaSchema,
    'Weekly Adjusted Time Series': z.record(z.string(), RawOhlcvWeeklyAdjustedSchema),
}).transform((d) => ({
    meta: {
        information: d['Meta Data']['1. Information'],
        symbol: d['Meta Data']['2. Symbol'],
        lastRefreshed: d['Meta Data']['3. Last Refreshed'],
        timeZone: d['Meta Data']['4. Time Zone'],
    },
    bars: toOhlcvWeeklyAdjustedArray(d['Weekly Adjusted Time Series']),
}))

export type WeeklyAdjusted = z.infer<typeof WeeklyAdjustedSchema>

// ─── TIME_SERIES_MONTHLY ─────────────────────────────────────────────────────

export const MonthlySchema = z.object({
    'Meta Data': WeeklyMetaSchema,
    'Monthly Time Series': z.record(z.string(), RawOhlcvSchema),
}).transform((d) => ({
    meta: {
        information: d['Meta Data']['1. Information'],
        symbol: d['Meta Data']['2. Symbol'],
        lastRefreshed: d['Meta Data']['3. Last Refreshed'],
        timeZone: d['Meta Data']['4. Time Zone'],
    },
    bars: toOhlcvArray(d['Monthly Time Series']),
}))

export type Monthly = z.infer<typeof MonthlySchema>

// ─── TIME_SERIES_MONTHLY_ADJUSTED ────────────────────────────────────────────

export const MonthlyAdjustedSchema = z.object({
    'Meta Data': WeeklyMetaSchema,
    'Monthly Adjusted Time Series': z.record(z.string(), RawOhlcvWeeklyAdjustedSchema),
}).transform((d) => ({
    meta: {
        information: d['Meta Data']['1. Information'],
        symbol: d['Meta Data']['2. Symbol'],
        lastRefreshed: d['Meta Data']['3. Last Refreshed'],
        timeZone: d['Meta Data']['4. Time Zone'],
    },
    bars: toOhlcvWeeklyAdjustedArray(d['Monthly Adjusted Time Series']),
}))

export type MonthlyAdjusted = z.infer<typeof MonthlyAdjustedSchema>

// ─── SYMBOL_SEARCH ───────────────────────────────────────────────────────────

export const SymbolSearchSchema = z.object({
    bestMatches: z.array(z.object({
        '1. symbol': z.string(),
        '2. name': z.string(),
        '3. type': z.string(),
        '4. region': z.string(),
        '5. marketOpen': z.string(),
        '6. marketClose': z.string(),
        '7. timezone': z.string(),
        '8. currency': z.string(),
        '9. matchScore': num,
    })),
}).transform((d) => ({
    bestMatches: d.bestMatches.map((m) => ({
        symbol: m['1. symbol'],
        name: m['2. name'],
        type: m['3. type'],
        region: m['4. region'],
        marketOpen: m['5. marketOpen'],
        marketClose: m['6. marketClose'],
        timezone: m['7. timezone'],
        currency: m['8. currency'],
        matchScore: m['9. matchScore'],
    })),
}))

export type SymbolSearch = z.infer<typeof SymbolSearchSchema>
export type SymbolMatch = SymbolSearch['bestMatches'][number]

// ─── MARKET_STATUS ───────────────────────────────────────────────────────────

export const MarketStatusSchema = z.object({
    markets: z.array(z.object({
        market_type: z.string(),
        region: z.string(),
        primary_exchanges: z.string(),
        local_open: z.string(),
        local_close: z.string(),
        current_status: z.string(),
        notes: z.string(),
    })),
})

export type MarketStatus = z.infer<typeof MarketStatusSchema>
export type MarketStatusEntry = MarketStatus['markets'][number]

// ─── INDEX_DATA ──────────────────────────────────────────────────────────────

export const IndexDataSchema = z.object({
    'Meta Data': z.object({
        '1. Information': z.string(),
        '2. Symbol': z.string(),
        '3. Last Refreshed': dateOnly,
        '4. Interval': z.string(),
        '5. Output Size': z.string(),
        '6. Time Zone': z.string(),
    }),
}).catchall(z.record(z.string(), RawOhlcIndexSchema)).transform((d) => {
    const seriesKey = Object.keys(d).find((k) => k !== 'Meta Data') ?? ''
    const raw = d[seriesKey] ?? {}
    return {
        meta: {
            information: d['Meta Data']['1. Information'],
            symbol: d['Meta Data']['2. Symbol'],
            lastRefreshed: d['Meta Data']['3. Last Refreshed'],
            interval: d['Meta Data']['4. Interval'],
            outputSize: d['Meta Data']['5. Output Size'],
            timeZone: d['Meta Data']['6. Time Zone'],
        },
        bars: toOhlcIndexArray(raw),
    }
})

export type IndexData = z.infer<typeof IndexDataSchema>

// ─── Parameter types ─────────────────────────────────────────────────────────

export type IntradayInterval = '1min' | '5min' | '15min' | '30min' | '60min'
export type OutputSize = 'compact' | 'full'
export type IndexSymbol = 'DJI' | 'SPX' | 'COMP' | 'NDX' | 'VIX'
export type IndexInterval = 'daily' | 'weekly' | 'monthly'
