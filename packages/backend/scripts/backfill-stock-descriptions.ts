import { createAppContext } from '../src/context.ts'
import { client } from '../src/db/index.ts'

const limitArg = process.argv.find((arg) => arg.startsWith('--limit='))
const limit = limitArg !== undefined ? Number(limitArg.slice('--limit='.length)) : undefined
const limitOption = limit !== undefined && Number.isFinite(limit) ? { limit } : {}

const { stockService } = createAppContext()

const descriptions = await stockService.backfillMissingDescriptions(limitOption)
console.log(
    `Descriptions: ${descriptions.updated} updated, ${descriptions.failed} failed, ${descriptions.pending - descriptions.updated} still pending.`,
)

const facts = await stockService.backfillMissingCompanyFacts(limitOption)
console.log(
    `Company facts: ${facts.updated} updated, ${facts.failed} failed, ${facts.pending - facts.updated} still pending.`,
)

await client.end()
