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

Requires `packages/backend/.env`. See `.env.example`.

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

`bun run deploy:staging` and `bun run deploy` run Drizzle migrations against Neon **before** `wrangler deploy`. For that you need two local env files in `packages/backend/` (not committed, contain database credentials):

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

## Market data synchronization

This section describes how stock prices, company names, and chart history are loaded and kept up to date.

### Overview

We use two related but separate sync flows:

1. **Tracked ticker sync** (`SYNC_TICKERS`): keeps a small set of liquid names (demo defaults or env override) fresh for portfolio pricing and leaderboards.
2. **Catalog backfill**: gradually fills the full imported ticker list (~12k symbols) with company names and 30 days of daily bars for the market tab.

Both flows read from the **uni stock API** and write into Postgres. The frontend always reads from our API and database, never from the uni API directly.

```
uni API (GET /stocks/{symbol})
        |
        |  Bun / GitHub Actions (works)
        |  Cloudflare Worker cron (cannot reach uni API in production, see below)
        v
Postgres (stock, stock_price, stock_daily_bar)
        |
        v
Cloudflare Worker API (/api/v1/stocks/...)
        |
        v
Frontend (market tab, detail sheet, portfolio)
```

### Uni API

| Endpoint | Purpose |
|----------|---------|
| `GET /stocks/{symbol}?token=...&date=YYYY-MM-DD` | Daily bar (open, high, low, close) and `stock_name` |
| `GET /stocks/{symbol}/price?token=...` | Live price (not used; rate limit is too strict) |

We use the daily endpoint for quotes as well: `getQuote()` derives a price from the day high/low range.

Configuration (Worker secrets or local `.env`):

| Variable | Description |
|----------|-------------|
| `STOCK_API_PROVIDER` | Set to `uni` in staging/production |
| `UNI_API_BASE_URL` | e.g. `http://123.123.123.123:2026` |
| `UNI_API_TOKEN` | API token |

Rate limit from the provider: about **60 requests per minute**. Catalog backfill respects a per-run API budget (default 55 calls on the Worker, higher in GitHub Actions).

**Date handling:** The uni API may return a `date` field that does not match the `date` query parameter. We always store bars under the **requested calendar date** so the 30-day window in Postgres lines up with what the chart expects.

### Database tables

| Table | Content |
|-------|---------|
| `stock` | Ticker metadata, cached `period_change_percent` / `day_change_percent`, `backfill_requested_at` for user-driven priority |
| `stock_price` | Point-in-time prices (sync and seeded closes) |
| `stock_daily_bar` | One row per stock per trading day (OHLC, source `uni_api`) |
| `sync_job` | Advisory lock and last-success timestamp for the hourly Worker job |

Imported tickers start with `company_name = ticker` and no bars. Backfill replaces the placeholder name and fills `stock_daily_bar`.

### Tracked ticker sync

**Code:** `src/modules/sync/sync.service.ts`

**Tickers:** `SYNC_TICKERS` env var (comma-separated). Defaults to `AAPL, MSFT, GOOGL, ...` if unset.

**Per ticker, each run:**

1. Ensure `stock` row exists (create from API metadata if missing).
2. Fetch quote via uni daily endpoint.
3. Insert `stock_price`.
4. Cache missing daily bars (up to `MAX_DAILY_BAR_FETCHES` per call).
5. Recompute and persist list metrics on `stock`.

**Scheduling:**

| Runtime | How it runs |
|---------|-------------|
| Local Bun (`bun run dev`) | In-process loop: `startScheduler()` polls every `SYNC_CHECK_INTERVAL_MS`, runs when `SYNC_INTERVAL_MS` elapsed |
| Cloudflare Worker | Cron `0 * * * *` calls `scheduled` in `src/index.ts`, which invokes `syncService.runDueTick()` |

**Locking:** Only one run at a time via `sync_job` row (`stock-price-sync`). Stale locks expire after 10 minutes.

**Debug:** When `STOCK_DEBUG=true`, external uni calls are skipped (mock/debug market instead).

### Catalog backfill

**Code:** `SyncService.runCatalogBackfill()` and `StockService` helpers (`listStocksNeedingNames`, `listStocksNeedingHistory`, `backfillStockHistory`, `applyStockNameFromApi`).

Each backfill pass, in order:

1. **Names:** Stocks where `company_name = ticker`. One API call each, up to `CATALOG_BACKFILL_NAMES_PER_TICK`.
2. **History:** Stocks with fewer than 30 bars in the rolling window. Up to `CATALOG_BACKFILL_HISTORY_STOCKS_PER_TICK` stocks, each receiving up to `CATALOG_BACKFILL_BARS_PER_STOCK` new bars.

A hard cap `CATALOG_BACKFILL_MAX_API_CALLS` limits total uni API calls per run. Calls are spaced out (~1s) to stay under the provider rate limit.

**Priority:** When a user opens `/api/v1/stocks/{ticker}/detail` and cached history is missing, we set `stock.backfill_requested_at`. The next backfill pass prefers those tickers over alphabetical order.

### Cloudflare Worker limitation (important)

Deployed Workers **cannot** call the uni API at `http://<ip>:51810` in production:

- Outbound `fetch()` does not use custom ports on arbitrary hosts.
- Requests to bare IPs are restricted.

The Worker **does** log `[uniapi] GET ...` before `fetch`, so logs can look successful even when no data is returned. `getDailyBar()` then returns `null` and nothing is written.

**Implication:**

| Action | Works on Worker? |
|--------|------------------|
| Read `/detail` from Postgres after backfill | Yes |
| Live fetch on first market-tab click | No (until uni API is on HTTPS port 443 with a hostname) |
| Worker hourly cron calling uni API | No |
| GitHub Actions / local Bun backfill | Yes |

Catalog backfill for staging/production must run **outside** the Worker (see below). The Worker cron still runs tracked-ticker logic and attempts catalog backfill, but only the DB read path is reliable in production today.

**Long-term fix:** Put the uni API behind a domain on port 443 (reverse proxy or tunnel) and point `UNI_API_BASE_URL` at that URL. Then on-demand `/detail` prefetch and Worker cron can call the API directly.

### GitHub Actions (staging catalog backfill)

**Workflow:** `.github/workflows/catalog-backfill-staging.yml`

| Trigger | Behavior |
|---------|----------|
| Cron `*/15 * * * *` | Batch backfill every 15 minutes |
| `workflow_dispatch` | Manual run; optional `ticker` input for a single symbol |

**Required repository secrets:**

| Secret | Value |
|--------|-------|
| `STAGING_DATABASE_URL` | Neon staging connection string |
| `UNI_API_TOKEN` | Uni API token |
| `UNI_API_BASE_URL` | `http://123.123.123.123:2026` |

The workflow sets `STOCK_DEBUG=false` and uses higher batch limits than the Worker defaults.

### CLI scripts

Run from `packages/backend` with `DATABASE_URL`, `UNI_API_*`, and `STOCK_API_PROVIDER=uni` set. Use `STOCK_DEBUG=false` for real API calls.

| Command | Description |
|---------|-------------|
| `bun run backfill:catalog` | One catalog backfill pass (names + history, respects env batch sizes) |
| `bun run backfill:catalog:staging` | Same, loading credentials from `.env.staging` |
| `bun run backfill:ticker COIN` | Full name + 30 daily bars for one ticker |
| `BACKFILL_TICKER=COIN bun run backfill:catalog` | Single-ticker mode used by the GitHub workflow |

Import tickers (metadata only, no prices):

```bash
bun run db:import-tickers
bun run db:import-tickers:staging
```

### Stock detail endpoint

**Route:** `GET /api/v1/stocks/:ticker/detail?historyDays=30`

**Code:** `StockService.getStockDetail()`

1. Load `stock` row.
2. If fewer than 2 cached daily bars: mark `backfill_requested_at`, attempt prefetch (works on Bun, not on Worker against `:51810`).
3. Resolve company name if still placeholder.
4. Build `priceHistory` from `stock_daily_bar` (and any `stock_price` rows in range).
5. Seed `stock_price` from the latest bar close if no price exists.
6. Return performance metrics and history JSON.

The frontend polls `/detail` for up to two minutes when history is still empty, so data can appear shortly after a GitHub Actions backfill without a full page reload.

### Environment variables

**Sync interval (tracked tickers):**

| Variable | Default | Description |
|----------|---------|-------------|
| `SYNC_TICKERS` | 10 demo symbols | Comma-separated list for price sync |
| `SYNC_INTERVAL_MS` | `3600000` (1h) on Worker, `20000` in `.env.example` | Minimum time between successful sync runs |
| `SYNC_CHECK_INTERVAL_MS` | `60000` / `5000` | Poll interval for local scheduler only |

**Catalog backfill:**

| Variable | Default (Worker) | Description |
|----------|------------------|-------------|
| `CATALOG_BACKFILL_NAMES_PER_TICK` | `20` | Max name lookups per run |
| `CATALOG_BACKFILL_HISTORY_STOCKS_PER_TICK` | `8` | Max stocks to backfill per run |
| `CATALOG_BACKFILL_BARS_PER_STOCK` | `10` | Max new bars per stock per run |
| `CATALOG_BACKFILL_MAX_API_CALLS` | `55` | Total API call budget per run |
| `BACKFILL_TICKER` | unset | If set, `backfill:catalog` only processes this ticker |

Worker staging/production defaults are set in `wrangler.jsonc`. GitHub Actions overrides several of these for larger batches.

### Key source files

| Path | Role |
|------|------|
| `src/modules/sync/sync.service.ts` | Scheduler, tracked sync, catalog backfill orchestration |
| `src/modules/stock/stock.service.ts` | DB reads/writes, bar cache, metrics, detail assembly |
| `src/modules/stockapi/uni-stock-client.ts` | Uni API HTTP client |
| `src/index.ts` | Worker `scheduled` cron entrypoint |
| `scripts/run-catalog-backfill.ts` | CLI / CI backfill entrypoint |
| `scripts/backfill-ticker.ts` | Single-ticker backfill |
| `scripts/import-tickers.ts` | Bulk ticker import |

### Local development tips

- Use `STOCK_DEBUG=true` in `.env` to avoid hitting the real uni API during everyday dev.
- For integration tests against real bar caching, set `STOCK_DEBUG=false` and provide `UNI_API_*`.
- `bun run cf:cron` exercises the Worker scheduled handler locally (uni reachability still differs from production).
- After schema changes (e.g. `backfill_requested_at`), run `bun run db:migrate` or `bun run db:migrate:staging`.

## Tests

```bash
just test
```
