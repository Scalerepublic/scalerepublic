import { createAppContext } from '../src/context.ts'
import { createDb } from '../src/db/index.ts'
import { UniStockClient } from '../src/modules/stockapi/uni-stock-client.ts'

const resolveDatabaseUrl = (): string => {
    const url = process.env.DATABASE_URL
    if (!url) {
        throw new Error('DATABASE_URL is required')
    }

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

const { db, client } = createDb(resolveDatabaseUrl())
const appCtx = createAppContext(db)
appCtx.stockDataClient = new UniStockClient()

try {
    await appCtx.syncService.runCatalogBackfillOnce()
} finally {
    await client.end()
}
