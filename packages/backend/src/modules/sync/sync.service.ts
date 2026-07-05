import { and, eq, lt, or } from 'drizzle-orm'
import { z } from 'zod'

import type { AppVars } from '../../context.ts'
import { syncJob } from '../../db/schema/sync.ts'
import { readEnvNumber } from '../../lib/env-number.ts'
import { isMarketDebugEnabled } from '../../lib/market-debug.ts'

const JOB_ID = 'stock-price-sync'
const DEFAULT_SYNC_INTERVAL_MS = 60 * 60 * 1000
const DEFAULT_CHECK_INTERVAL_MS = 60 * 1000
const DEFAULT_SYNC_MAX_TICKERS = 500
const DEFAULT_SYNC_TRENDING_LIMIT = 24
const CATALOG_BACKFILL_BATCH_SIZE = 5
const CATALOG_BACKFILL_BATCH_INTERVAL_MS = 5000
const DEFAULT_NAMES_BACKFILL_BATCH = 20
const DEFAULT_HISTORY_BACKFILL_STOCKS = 8
const DEFAULT_HISTORY_BARS_PER_STOCK = 10
const DEFAULT_MAX_UNI_API_CALLS_PER_TICK = 40
const DEFAULT_CATALOG_BACKFILL_MIN_INTERVAL_MS = 5 * 60 * 1000
const DEFAULT_STALE_LOCK_MS = 10 * 60 * 1000

const DEFAULT_TICKERS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'JPM', 'V', 'UNH']

const TickerSchema = z.string().regex(/^[A-Z]{1,5}$/, 'must be 1–5 uppercase letters')

export const parseSeedTickers = (): string[] => {
    const raw = process.env['SYNC_TICKERS']
    if (raw === undefined || raw.trim() === '') return DEFAULT_TICKERS

    const candidates = raw.split(',').map(t => t.trim().toUpperCase()).filter(Boolean)
    if (candidates.length === 0) return DEFAULT_TICKERS

    const result = z.array(TickerSchema).min(1).safeParse(candidates)
    if (!result.success) {
        const invalid = result.error.issues.map(i => candidates[i.path[0] as number])
        throw new Error(`Invalid ticker symbols in SYNC_TICKERS: ${invalid.join(', ')}`)
    }

    return result.data
}

export const parseTrackedTickers = parseSeedTickers

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

const catalogBackfillOnCron = (): boolean => process.env['CATALOG_BACKFILL_ON_CRON'] !== 'false'

export class SyncService {
    private lockId: string | null = null

    constructor(private readonly ctx: AppVars) {}

    private getLockId(): string {
        this.lockId ??= `sync-${crypto.randomUUID()}`
        return this.lockId
    }

    async resolvePriceSyncTickers(): Promise<string[]> {
        const maxTickers = readEnvNumber('SYNC_MAX_TICKERS', DEFAULT_SYNC_MAX_TICKERS)
        const trendingLimit = readEnvNumber('SYNC_TRENDING_LIMIT', DEFAULT_SYNC_TRENDING_LIMIT)

        const heldStockIds = await this.ctx.tradesService.listHeldStockIds()
        const heldTickers = [...(await this.ctx.stockService.getTickersByStockIds(heldStockIds)).values()]
        const seedTickers = parseSeedTickers()
        const trendingTickers = (await this.ctx.stockService.getTrending(trendingLimit)).map((row) => row.ticker)

        const seen = new Set<string>()
        const tickers: string[] = []

        for (const ticker of [...heldTickers, ...seedTickers, ...trendingTickers]) {
            const normalized = ticker.trim().toUpperCase()
            if (normalized === '' || seen.has(normalized)) continue
            seen.add(normalized)
            tickers.push(normalized)
            if (tickers.length >= maxTickers) break
        }

        return tickers
    }

    private async ensureStock(ticker: string): Promise<string | null> {
        const existing = await this.ctx.stockService.getStockId(ticker)
        if (existing !== null) return existing

        const meta = await this.ctx.stockDataClient.getStockMeta(ticker)
        if (!meta) {
            console.warn(`[sync] No metadata found for "${ticker}" — skipping`)
            return null
        }

        return this.ctx.stockService.createStock(ticker, meta.name, meta.exchange, meta.currency)
    }

    private async syncTicker(ticker: string): Promise<boolean> {
        const stockId = await this.ensureStock(ticker)
        if (stockId === null) return false

        if (!await this.ctx.stockService.insertSyntheticQuote(stockId)) {
            console.warn(`[sync] ${ticker}: no daily bar or prior price — skipping quote`)
            return false
        }

        await this.ctx.stockService.refreshStockMetrics(stockId)

        console.log(`[sync] ${ticker}: synthetic quote stored`)
        return true
    }

    private async runSync(tickers: string[]): Promise<void> {
        if (isMarketDebugEnabled()) {
            console.log('[sync] Skipping external price sync while STOCK_DEBUG=true')
            return
        }

        if (tickers.length === 0) {
            return
        }

        let succeeded = 0
        for (const ticker of tickers) {
            try {
                if (await this.syncTicker(ticker)) {
                    succeeded += 1
                }
            } catch (err) {
                console.error(`[sync] ${ticker} failed: ${err instanceof Error ? err.message : err}`)
            }
        }

        if (succeeded === 0) {
            throw new Error(`Price sync failed for all ${tickers.length} tracked tickers`)
        }
    }

    private readBackfillConfig(): {
        namesPerTick: number
        historyStocksPerTick: number
        barsPerStock: number
        maxApiCallsPerTick: number
    } {
        return {
            namesPerTick: readEnvNumber('CATALOG_BACKFILL_NAMES_PER_TICK', DEFAULT_NAMES_BACKFILL_BATCH),
            historyStocksPerTick: readEnvNumber('CATALOG_BACKFILL_HISTORY_STOCKS_PER_TICK', DEFAULT_HISTORY_BACKFILL_STOCKS),
            barsPerStock: readEnvNumber('CATALOG_BACKFILL_BARS_PER_STOCK', DEFAULT_HISTORY_BARS_PER_STOCK),
            maxApiCallsPerTick: readEnvNumber('CATALOG_BACKFILL_MAX_API_CALLS', DEFAULT_MAX_UNI_API_CALLS_PER_TICK),
        }
    }

    private async backfillCatalogNames(batchSize: number, apiBudget: { remaining: number }): Promise<void> {
        if (apiBudget.remaining <= 0) {
            return
        }

        const stocks = await this.ctx.stockService.listStocksNeedingNames(Math.min(batchSize, apiBudget.remaining))
        if (stocks.length === 0) {
            return
        }

        console.log(`[sync/backfill] Resolving names for ${stocks.length} stocks (budget ${apiBudget.remaining})`)
        for (const { id, ticker } of stocks) {
            if (apiBudget.remaining <= 0) {
                break
            }

            apiBudget.remaining -= 1
            try {
                const updated = await this.ctx.stockService.applyStockNameFromApi(id, ticker)
                if (updated) {
                    console.log(`[sync/backfill] ${ticker}: name resolved`)
                }
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err)
                console.error(`[sync/names] ${ticker} failed: ${message}`)
            }

            await sleep(CATALOG_BACKFILL_BATCH_INTERVAL_MS / CATALOG_BACKFILL_BATCH_SIZE)
        }
    }

    private async backfillCatalogHistory(
        stocksPerTick: number,
        barsPerStock: number,
        apiBudget: { remaining: number },
    ): Promise<void> {
        if (apiBudget.remaining <= 0) {
            return
        }

        const stocks = await this.ctx.stockService.listStocksNeedingHistory(stocksPerTick)
        if (stocks.length === 0) {
            return
        }

        console.log(`[sync/backfill] Backfilling history for up to ${stocks.length} stocks (budget ${apiBudget.remaining})`)
        for (const { id, ticker } of stocks) {
            if (apiBudget.remaining <= 0) {
                break
            }

            const maxFetches = Math.min(barsPerStock, apiBudget.remaining)
            try {
                const { fetchesUsed } = await this.ctx.stockService.backfillStockHistory(id, ticker, { maxFetches })
                apiBudget.remaining -= fetchesUsed
                if (fetchesUsed > 0) {
                    console.log(`[sync/backfill] ${ticker}: stored ${fetchesUsed} daily bars`)
                }
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err)
                console.error(`[sync/backfill] ${ticker} failed: ${message}`)
            }

            await sleep(CATALOG_BACKFILL_BATCH_INTERVAL_MS / CATALOG_BACKFILL_BATCH_SIZE)
        }
    }

    private async runCatalogBackfill(): Promise<void> {
        if (isMarketDebugEnabled()) {
            console.log('[sync/backfill] Skipping catalog backfill while STOCK_DEBUG=true')
            return
        }

        const config = this.readBackfillConfig()
        const apiBudget = { remaining: config.maxApiCallsPerTick }
        await this.backfillCatalogNames(config.namesPerTick, apiBudget)
        await this.backfillCatalogHistory(config.historyStocksPerTick, config.barsPerStock, apiBudget)
        console.log(`[sync/backfill] Finished with ${apiBudget.remaining} API calls remaining`)
    }

    async runCatalogBackfillOnce(): Promise<void> {
        await this.runCatalogBackfill()
    }

    private async getJobRow(): Promise<{
        status: 'idle' | 'running' | 'failed'
        lockedAt: Date | null
    } | null> {
        const row = await this.ctx.db
            .select({ status: syncJob.status, lockedAt: syncJob.lockedAt })
            .from(syncJob)
            .where(eq(syncJob.id, JOB_ID))
            .limit(1)
        return row[0] ?? null
    }

    private async isSyncDue(syncDueThreshold: Date): Promise<boolean> {
        const row = await this.ctx.db
            .select({ lastSuccessAt: syncJob.lastSuccessAt })
            .from(syncJob)
            .where(eq(syncJob.id, JOB_ID))
            .limit(1)
        const lastSuccessAt = row[0]?.lastSuccessAt
        return !lastSuccessAt || lastSuccessAt < syncDueThreshold
    }

    private async tryClaimJob(staleThreshold: Date): Promise<boolean> {
        const lockId = this.getLockId()
        const claimed = await this.ctx.db.update(syncJob).set({
            status: 'running',
            lockedAt: new Date(),
            lockedBy: lockId,
            lastStartedAt: new Date(),
        }).where(and(
            eq(syncJob.id, JOB_ID),
            or(
                eq(syncJob.status, 'idle'),
                eq(syncJob.status, 'failed'),
                and(
                    eq(syncJob.status, 'running'),
                    lt(syncJob.lockedAt, staleThreshold),
                ),
            ),
        )).returning({ id: syncJob.id })
        return claimed.length > 0
    }

    async syncOnce(tickers?: string[]): Promise<void> {
        const resolved = tickers ?? await this.resolvePriceSyncTickers()
        await this.runSync(resolved)
    }

    async runDueTick(): Promise<void> {
        const syncIntervalMs = readEnvNumber('SYNC_INTERVAL_MS', DEFAULT_SYNC_INTERVAL_MS)
        const staleLockMs = readEnvNumber(
            'SYNC_STALE_LOCK_MS',
            Math.max(DEFAULT_STALE_LOCK_MS, syncIntervalMs * 5),
        )
        const backfillMinIntervalMs = readEnvNumber(
            'CATALOG_BACKFILL_MIN_INTERVAL_MS',
            DEFAULT_CATALOG_BACKFILL_MIN_INTERVAL_MS,
        )

        try {
            await this.ctx.db.insert(syncJob).values({ id: JOB_ID }).onConflictDoNothing()

            const staleThreshold = new Date(Date.now() - staleLockMs)
            const syncDueThreshold = new Date(Date.now() - syncIntervalMs)

            if (!await this.isSyncDue(syncDueThreshold)) return
            if (!await this.tryClaimJob(staleThreshold)) {
                const job = await this.getJobRow()
                if (job?.status !== 'running') {
                    console.log('[sync] Failed to lock sync')
                }
                return
            }
            console.log(`[sync] Lock acquired by ${this.getLockId()}`)

            try {
                const tickers = await this.resolvePriceSyncTickers()
                console.log(`[sync] Price sync for ${tickers.length} tickers`)

                let syncError: string | null = null
                try {
                    await this.runSync(tickers)
                } catch (err) {
                    syncError = err instanceof Error ? err.message : String(err)
                    console.error(`[sync] Price sync failed: ${syncError}`)
                }

                if (syncError !== null) {
                    await this.ctx.db.update(syncJob).set({
                        status: 'failed',
                        lastError: syncError,
                        lockedAt: null,
                        lockedBy: null,
                    }).where(eq(syncJob.id, JOB_ID))
                    return
                }

                await this.ctx.db.update(syncJob).set({
                    status: 'idle',
                    lastSuccessAt: new Date(),
                    lastError: null,
                    lockedAt: null,
                    lockedBy: null,
                }).where(eq(syncJob.id, JOB_ID))
                console.log('[sync] Price sync completed')

                await this.ctx.portfolioDefaultService.checkAllActivePortfolios()

                if (syncIntervalMs >= backfillMinIntervalMs) {
                    if (catalogBackfillOnCron()) {
                        try {
                            await this.runCatalogBackfill()
                            console.log('[sync] Catalog backfill completed')
                        } catch (err) {
                            const message = err instanceof Error ? err.message : String(err)
                            console.error(`[sync/backfill] Failed: ${message}`)
                        }
                    } else {
                        console.log('[sync] Skipping catalog backfill (CATALOG_BACKFILL_ON_CRON=false)')
                    }
                }
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err)
                await this.ctx.db.update(syncJob).set({
                    status: 'failed',
                    lastError: message,
                    lockedAt: null,
                    lockedBy: null,
                }).where(eq(syncJob.id, JOB_ID))
                console.error(`[sync] Failed: ${message}`)
            }
        } catch (err) {
            console.error('[sync] Tick error:', err)
        }
    }

    async startScheduler(): Promise<void> {
        const syncIntervalMs = readEnvNumber('SYNC_INTERVAL_MS', DEFAULT_SYNC_INTERVAL_MS)
        const checkIntervalMs = readEnvNumber('SYNC_CHECK_INTERVAL_MS', DEFAULT_CHECK_INTERVAL_MS)
        const maxTickers = readEnvNumber('SYNC_MAX_TICKERS', DEFAULT_SYNC_MAX_TICKERS)

        console.log(`[sync] Dynamic price sync up to ${maxTickers} tickers. Sync every ${syncIntervalMs / 1000}s, check every ${checkIntervalMs / 1000}s`)

        for (;;) {
            await this.runDueTick()
            await sleep(checkIntervalMs)
        }
    }
}
