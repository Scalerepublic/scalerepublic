import { resolveDatabaseUrl } from '../src/lib/resolve-database-url.ts'
import postgres from 'postgres'

const REQUIRED_OBJECTS = [
    { kind: 'table', name: 'stock_daily_bar' },
    { kind: 'column', table: 'stock', name: 'backfill_requested_at' },
    { kind: 'column', table: 'stock', name: 'description' },
] as const

const sql = postgres(resolveDatabaseUrl())

try {
    for (const object of REQUIRED_OBJECTS) {
        if (object.kind === 'table') {
            const [row] = await sql`SELECT to_regclass(${`public.${object.name}`}) as present`
            if (row?.present === null) {
                throw new Error(`Missing required table: ${object.name}`)
            }
            continue
        }

        const [row] = await sql`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = ${object.table}
              AND column_name = ${object.name}
            LIMIT 1
        `
        if (row === undefined) {
            throw new Error(`Missing required column: ${object.table}.${object.name}`)
        }
    }

    console.log('[db:verify] schema OK')
} finally {
    await sql.end()
}
