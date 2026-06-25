# ScaleRepublic

Toy stock exchange for PP3S — SvelteKit frontend, Bun/Hono backend, Postgres.

## Prerequisites

- [Bun](https://bun.sh) 1.3+
- [Docker](https://docs.docker.com/get-docker/) (for Postgres)
- [just](https://github.com/casey/just) (task runner)

## Quick start

From the repository root:

```bash
just dev
```

This will:

1. Create `packages/backend/.env` and `packages/frontend/.env` from the examples (if missing)
2. Install dependencies
3. Start Postgres in Docker (`localhost:50025`)
4. Apply database migrations
5. Start the backend on **http://localhost:50030** (live Bun process — always current code)
6. Start the frontend on **http://localhost:5173**

Open **http://localhost:5173** in your browser.

Press `Ctrl+C` to stop backend and frontend. Postgres keeps running until you run `just down`.

## Common commands

| Command | Description |
|---------|-------------|
| `just dev` | Full local dev stack (recommended) |
| `just setup` | Install deps and create `.env` files |
| `just up` | Start Postgres + run migrations only |
| `just down` | Stop Docker services |
| `just db-migrate` | Apply pending migrations |
| `just db-studio` | Open Drizzle Studio |
| `just up-docker` | Run backend **in Docker** (rebuilds image) |
| `just test` | Backend integration tests |
| `just lint` | Lint backend and frontend |

Package-specific recipes live in `packages/backend/justfile` and `packages/frontend/justfile`.

## Environment variables

### `packages/backend/.env`

Copy from `.env.example` on first run (`just setup`).

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | yes | Postgres URL for host-side tools (`db:migrate`, `bun dev`). Use port **50025** with Docker Compose. |
| `PORT` | no | HTTP port for `bun dev` (default `3000`). Set **50030** to match the Vite proxy. |
| `BETTER_AUTH_SECRET` | yes | Random secret for session signing |
| `BETTER_AUTH_URL` | yes | Public frontend URL for auth callbacks — **http://localhost:5173** in local dev |
| `STOCK_DEBUG` | no | `true` enables simulated market + debug endpoints |
| `MARKET_DEBUG_OPERATOR_EMAIL` | no | Email allowed to use `/api/v1/debug/market/*` when `STOCK_DEBUG=true` |
| `STOCK_API_PROVIDER` | no | `uni` or `alphavantage` |
| `UNI_API_*` / `ALPHAVANTAGE_API_KEY` | if using live prices | Stock API credentials |
| `SYNC_INTERVAL_MS` | no | Price sync interval (Bun scheduler only) |
| `MIN_NET_WORTH_THRESHOLD` | no | Net worth below this triggers portfolio default (default `1.00`) |

Inside Docker Compose, the backend container uses an internal `DATABASE_URL` (`postgres:5432`). Host-side commands always use `localhost:50025`.

### `packages/frontend/.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | yes (SSR) | Backend origin for server-side API calls — **http://localhost:50030** in local dev |

In the browser, `/api` requests are proxied by Vite to `localhost:50030`. SSR (`+page.ts` load functions) uses `VITE_API_URL` directly.

## Local ports

| Service | Port |
|---------|------|
| Frontend (Vite) | 5173 |
| Backend (`bun dev`) | 50030 |
| Postgres (Docker) | 50025 |
| Drizzle Studio (optional) | 4983 |

## Docker vs local backend

If port 50030 is already in use, stop the Docker backend container:

```bash
cd packages/backend && docker compose stop backend
```

**Recommended for daily development:** `just dev` runs Postgres in Docker and the backend with `bun --hot` on the host. Code changes apply immediately — no image rebuild.

**Docker backend** (`just up-docker` or `docker compose up --build -d` in `packages/backend`): runs a compiled `dist/index.js` inside a container on port 50030. Rebuild after code changes:

```bash
cd packages/backend
docker compose up --build -d backend
```

If the leaderboard shows stale mock data (Alice/Bob/Charlie), the Docker image is outdated — use `just dev` or rebuild.

## Cloudflare Workers (optional)

For testing the production Workers runtime locally:

```bash
# Terminal 1 — Postgres + migrations
just up

# Terminal 2 — backend worker
cd packages/backend && bun run cf:dev

# Terminal 3 — frontend worker
cd packages/frontend && bun run cf:preview
```

Create `packages/backend/.dev.vars` for Wrangler secrets (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`). See `packages/backend/wrangler.jsonc`.

Deploy to staging: `bun run deploy:staging` in each package.
