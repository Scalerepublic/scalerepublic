import { createAppContext } from '../src/context.ts'
import { client } from '../src/db/index.ts'

const limitArg = process.argv.find((arg) => arg.startsWith('--limit='))
const limit = limitArg !== undefined ? Number(limitArg.slice('--limit='.length)) : undefined
const limitOption = limit !== undefined && Number.isFinite(limit) ? { limit } : {}

const { stockService } = createAppContext()

const result = await stockService.backfillStockInfo(limitOption)
console.log(
    `Stock info (Wikipedia + Wikidata): ${result.updated} updated, ${result.failed} failed, ${result.pending - result.updated} still pending.`,
)

await client.end()
