import { eq } from 'drizzle-orm'

import { db, exampleItems } from '../../db/index.ts'

export class ExampleService {
    async getById(id: string) {
        const rows = await db.select().from(exampleItems).where(eq(exampleItems.id, id)).limit(1)
        return rows[0] ?? null
    }
}
