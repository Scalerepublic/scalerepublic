# Backend Template

Minimal Bun backend template with:
- Hono app bootstrap
- Drizzle Postgres setup
- One example API module
- One Zod-validated registered route

## Structure

`src/index.ts` - app bootstrap and route registration

`src/db/index.ts` - Drizzle + Postgres client

`src/db/schema/example-items.ts` - example Drizzle schema

`src/modules/example/example.routes.ts` - example route module

`src/modules/example/example.service.ts` - example service using Drizzle

`src/modules/example/example.schema.ts` - Zod request schema

## Run

```bash
bun install
bun run dev
```

## Required env vars

```bash
DATABASE_URL=postgres://...
```
x