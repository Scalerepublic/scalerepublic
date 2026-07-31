/**
 * Purpose: Normalize Postgres URLs and require TLS parameters for hosted database connections.
 */
export const resolveDatabaseUrl = (url = process.env.DATABASE_URL): string => {
    if (url === undefined || url === '') {
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
