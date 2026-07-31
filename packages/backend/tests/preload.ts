/**
 * Purpose: Close the shared Postgres connection after Bun finishes the backend test suite.
 */
import { afterAll } from 'bun:test'

import { client } from '../src/db/index.ts'

afterAll(async () => {
    await client.end()
})
