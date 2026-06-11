import { afterAll } from 'bun:test'

import { client } from '../src/db/index.ts'

afterAll(async () => {
    await client.end()
})
