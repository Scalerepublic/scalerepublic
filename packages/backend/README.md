# Backend

Bun + Hono API with Drizzle ORM and Postgres.

## Local development

Use the repository root:

```bash
just dev
```

Or from this directory after Postgres is running:

```bash
bun run dev
```

Requires `packages/backend/.env` — see `.env.example`.

## Database

| Command | Description |
|---------|-------------|
| `just db-migrate` | Apply migrations (host, uses `.env`) |
| `just db-generate` | Generate migration from schema changes |
| `just db-studio` | Drizzle Studio |
| `just db-seed` | Seed data |
| `just up-db` | Start Postgres container only |

Host `DATABASE_URL` must use port **50025** (Docker maps `50025:5432`).

## Docker

```bash
just up          # Postgres + backend container (rebuilds)
just up-db       # Postgres only
just rebuild     # Rebuild backend image
```

## Cloudflare Workers

```bash
bun run cf:dev     # local Workers runtime
bun run cf:cron    # test scheduled handler
bun run deploy:staging
```

Wrangler uses Hyperdrive `localConnectionString` → `localhost:50025`. Add secrets in `.dev.vars`.

## Tests

```bash
just test
```
