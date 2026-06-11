import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import postgres from "postgres";

import journal from "../drizzle/meta/_journal.json";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    console.error("DATABASE_URL is required");
    process.exit(1);
}

const sql = postgres(connectionString, { max: 1 });

const hashFile = (relativePath: string) =>
    createHash("sha256").update(readFileSync(join(import.meta.dir, "..", relativePath))).digest("hex");

const schemaReadyForDomainMigration = async () => {
    const row = await sql`
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'portfolio'
        LIMIT 1
    `;
    return row.length > 0;
};

try {
    const domainReady = await schemaReadyForDomainMigration();

    for (const entry of journal.entries) {
        const file = `drizzle/${entry.tag}.sql`;
        const hash = hashFile(file);
        const existing = await sql`
            SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash = ${hash} LIMIT 1
        `;

        if (existing.length > 0) {
            console.log(`[baseline] skip ${entry.tag} (already recorded)`);
            continue;
        }

        if (entry.idx > 0 && !domainReady) {
            console.error(
                `[baseline] cannot mark ${entry.tag}: domain tables missing — run db:migrate or just db-reset`,
            );
            process.exit(1);
        }

        await sql`
            INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
            VALUES (${hash}, ${entry.when})
        `;
        console.log(`[baseline] recorded ${entry.tag}`);
    }
} finally {
    await sql.end();
}
