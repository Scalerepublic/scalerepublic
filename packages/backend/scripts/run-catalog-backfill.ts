import { createAppContext } from '../src/context.ts'
import { createDb } from '../src/db/index.ts'
import { resolveDatabaseUrl } from '../src/lib/resolve-database-url.ts'
import { UniStockClient } from '../src/modules/stockapi/uni-stock-client.ts'

const { db, client } = createDb(resolveDatabaseUrl())
const appCtx = createAppContext(db)
appCtx.stockDataClient = new UniStockClient()

const ticker = process.env['BACKFILL_TICKER']?.trim().toUpperCase()

try {
    if (ticker) {
        await appCtx.stockService.backfillTickerFully(ticker)
        console.log(`[backfill] ${ticker}: done`)
    } else {
        await appCtx.syncService.runCatalogBackfillOnce()
    }
} finally {
    await client.end()
}
