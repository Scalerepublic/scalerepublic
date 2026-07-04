import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { createDb } from '../src/db/index.ts'

const BATCH_SIZE = 500
const TICKERS_PATH = resolve(import.meta.dir, '../data/uni-tickers.json')

const resolveDatabaseUrl = (url: string): string => {
    try {
        const parsed = new URL(url.replace(/^postgresql:/, 'postgres:'))
        const isRemotePostgres =
            parsed.hostname !== 'localhost'
            && parsed.hostname !== '127.0.0.1'
            && parsed.hostname !== 'postgres'

        if (isRemotePostgres && !parsed.searchParams.has('sslmode')) {
            parsed.searchParams.set('sslmode', 'require')
        }

        return parsed.toString().replace(/^postgres:/, 'postgresql:')
    } catch {
        return url
    }
}

const loadTickers = (): string[] => {
    const raw = readFileSync(TICKERS_PATH, 'utf8')
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) {
        throw new Error(`Expected JSON array in ${TICKERS_PATH}`)
    }
    return [...new Set(parsed.map((t) => String(t).trim().toUpperCase()).filter(Boolean))]
}

const connectionString = process.env.DATABASE_URL
if (connectionString === undefined || connectionString === '') {
    console.error('DATABASE_URL is required')
    process.exit(1)
}

const tickers = loadTickers()
const { client } = createDb(resolveDatabaseUrl(connectionString))

let inserted = 0
for (let i = 0; i < tickers.length; i += BATCH_SIZE) {
    const batch = tickers.slice(i, i + BATCH_SIZE)
    const rows = batch.map((ticker) => ({
        id: crypto.randomUUID(),
        ticker,
        company_name: ticker,
        exchange: 'UNKNOWN',
        currency: 'USD',
        is_active: true,
    }))
    const result = await client`
        INSERT INTO stock ${client(rows, 'id', 'ticker', 'company_name', 'exchange', 'currency', 'is_active')}
        ON CONFLICT (ticker) DO NOTHING
        RETURNING ticker
    `

    inserted += result.length
    console.log(`[import-tickers] ${Math.min(i + BATCH_SIZE, tickers.length)}/${tickers.length} processed, +${result.length} new`)
}

await client.end()
console.log(`[import-tickers] done: ${inserted} inserted, ${tickers.length - inserted} already existed`)
