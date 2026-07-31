import type { Config } from 'drizzle-kit'

import { resolveDatabaseUrl } from './src/lib/resolve-database-url.ts'

export default {
    schema: ['./src/db/schema/**/*.ts', '!./src/db/schema/**/index.ts'],
    out: './drizzle',
    dialect: 'postgresql',
    dbCredentials: {
        url: resolveDatabaseUrl(),
    },
    casing: 'snake_case',
} satisfies Config
