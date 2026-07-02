import type { Config } from 'drizzle-kit'

const resolveDatabaseUrl = (): string => {
    const url = process.env.DATABASE_URL
    if (!url) {
        throw new Error('DATABASE_URL is not set')
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

export default {
    schema: ['./src/db/schema/**/*.ts', '!./src/db/schema/**/index.ts'],
    out: './drizzle',
    dialect: 'postgresql',
    dbCredentials: {
        url: resolveDatabaseUrl(),
    },
    casing: 'snake_case',
} satisfies Config
