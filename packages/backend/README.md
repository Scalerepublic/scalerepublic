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
| `just db-migrate-staging` | Apply migrations to remote Neon staging |
| `just db-migrate-prod` | Apply migrations to remote Neon production |
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
bun run cf:dev           # local Workers runtime
bun run cf:dev:staging   # local Workers runtime (staging env)
bun run cf:cron          # test scheduled handler
bun run deploy:staging   # migrate staging DB, then wrangler deploy
bun run deploy           # migrate production DB, then wrangler deploy
```

Wrangler uses Hyperdrive `localConnectionString` → `localhost:50025`. Add secrets in `.dev.vars`.

### Remote migrations (staging / production)

`bun run deploy:staging` and `bun run deploy` run Drizzle migrations against Neon **before** `wrangler deploy`. For that you need two local env files in `packages/backend/` (not committed — contain database credentials):

| File | Purpose |
|------|---------|
| `.env.staging` | `DATABASE_URL` for the Neon staging database |
| `.env.production` | `DATABASE_URL` for the Neon production database |

Example (Neon pooler URL):

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/neondb
```

`drizzle.config.ts` adds `sslmode=require` automatically for remote hosts. Migrations can also be run without deploying:

```bash
bun run db:migrate:staging
bun run db:migrate:prod
# or
just db-migrate-staging
just db-migrate-prod
```

## Tests

```bash
just test
```
