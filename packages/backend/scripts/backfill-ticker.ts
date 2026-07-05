import { createAppContext } from '../src/context.ts'
import { createDb } from '../src/db/index.ts'
import { resolveDatabaseUrl } from '../src/lib/resolve-database-url.ts'
import { UniStockClient } from '../src/modules/stockapi/uni-stock-client.ts'

const ticker = process.argv[2]?.trim().toUpperCase()
if (!ticker) {
    throw new Error('Usage: bun scripts/backfill-ticker.ts TICKER')
}

const { db, client } = createDb(resolveDatabaseUrl())
const appCtx = createAppContext(db)
appCtx.stockDataClient = new UniStockClient()

try {
    await appCtx.stockService.backfillTickerFully(ticker)
    console.log(`[backfill] ${ticker}: done`)
} finally {
    await client.end()
}
