/**
 * Purpose: Coordinate locked price synchronization and rate-limited catalog backfill without overlapping scheduled runs.
 */
import { and, eq, lt, or } from 'drizzle-orm'

import type { AppVars } from '../../context.ts'
import { syncJob } from '../../db/schema/sync.ts'
import { readEnvNumber } from '../../lib/env-number.ts'
import { isMarketDebugEnabled } from '../../lib/market-debug.ts'

const JOB_ID = 'stock-price-sync'
const DEFAULT_SYNC_INTERVAL_MS = 60 * 60 * 1000
const DEFAULT_CHECK_INTERVAL_MS = 60 * 1000
const CATALOG_BACKFILL_BATCH_SIZE = 5
const CATALOG_BACKFILL_BATCH_INTERVAL_MS = 5000
const DEFAULT_NAMES_BACKFILL_BATCH = 20
const DEFAULT_HISTORY_BACKFILL_STOCKS = 8
const DEFAULT_HISTORY_BARS_PER_STOCK = 10
const DEFAULT_MAX_UNI_API_CALLS_PER_TICK = 40
const DEFAULT_CATALOG_BACKFILL_MIN_INTERVAL_MS = 5 * 60 * 1000
const DEFAULT_STALE_LOCK_MS = 10 * 60 * 1000
const AUTO_TRADE_BATCH_SIZE = 20

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

const catalogBackfillOnCron = (): boolean => process.env['CATALOG_BACKFILL_ON_CRON'] !== 'false'

const chunk = <T>(arr: T[], size: number): T[][] => {
    const out: T[][] = []
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
    return out
}

/**
 * Runs all recurring market work behind a database-backed lease. Both a Bun process and a
 * Cloudflare scheduled event may invoke this service; the sync_job row prevents duplicate work.
 */
export class SyncService {
    private lockId: string | null = null

    constructor(private readonly ctx: AppVars) {}

    private getLockId(): string {
        this.lockId ??= `sync-${crypto.randomUUID()}`
        return this.lockId
    }

    private async runSync(): Promise<void> {
        if (isMarketDebugEnabled()) {
            console.log('[sync] Skipping external price sync while STOCK_DEBUG=true')
            return
        }

        const { inserted, stockIds } = await this.ctx.stockService.insertSyntheticQuotesForAllEligible()
        if (inserted === 0) {
            console.warn('[sync] No eligible stocks with market data — skipping quote sync')
            return
        }

        console.log(`[sync] Stored ${inserted} synthetic quotes across ${stockIds.length} stocks`)

        await this.ctx.stockService.refreshStockMetricsBatch(stockIds)
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

    // Names run first because they need one cheap request each. History consumes whatever remains
    // of the shared request budget, keeping a scheduler tick below the provider's rate limit.
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

    private async runCatalogBackfillIfDue(
        syncIntervalMs: number,
        backfillMinIntervalMs: number,
    ): Promise<void> {
        if (syncIntervalMs < backfillMinIntervalMs) {
            return
        }

        if (!catalogBackfillOnCron()) {
            console.log('[sync] Skipping catalog backfill (CATALOG_BACKFILL_ON_CRON=false)')
            return
        }

        try {
            await this.runCatalogBackfill()
            console.log('[sync] Catalog backfill completed')
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err)
            console.error(`[sync/backfill] Failed: ${message}`)
        }
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

    /** Atomically claim an idle/failed job or recover a lease abandoned by a crashed runtime. */
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

    async syncOnce(): Promise<void> {
        await this.runSync()
    }

    async checkAllAutoTrades(): Promise<void> {
        const expired = await this.ctx.autoTradeService.expireAutoTrades()
        if (expired > 0) console.log(`[autotrade] Expired ${expired} rule(s)`)

        const rules = await this.ctx.autoTradeService.getActiveAutoTrades()
        if (rules.length === 0) return

        console.log(`[autotrade] Evaluating ${rules.length} active rule(s)`)
        const batches = chunk(rules, AUTO_TRADE_BATCH_SIZE)
        for (const batch of batches) {
            const results = await Promise.allSettled(
                batch.map(rule => this.ctx.autoTradeService.executeAutoTrade(rule)),
            )
            results.forEach((r, i) => {
                const rule = batch[i]!
                if (r.status === 'fulfilled') {
                    if (r.value) console.log(`[autotrade] Rule ${rule.id} triggered -> trade ${r.value.id}`)
                } else {
                    const message = r.reason instanceof Error ? r.reason.message : String(r.reason)
                    console.error(`[autotrade] Rule ${rule.id} failed: ${message}`)
                }
            })
        }
    }

    /**
     * Execute a complete due tick in dependency order: quote sync, automatic orders, default
     * portfolio checks, then optional slow catalog enrichment. Price-sync success is recorded
     * before ancillary work, so a backfill failure does not duplicate quotes on the next poll.
     */
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
                console.log('[sync] Batch price sync for all eligible stocks')

                let syncError: string | null = null
                try {
                    await this.runSync()
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

                await this.checkAllAutoTrades()
                await this.ctx.portfolioDefaultService.checkAllActivePortfolios()

                await this.runCatalogBackfillIfDue(syncIntervalMs, backfillMinIntervalMs)
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

    /** Local Bun scheduler; Workers call runDueTick from their scheduled handler instead. */
    async startScheduler(): Promise<void> {
        const syncIntervalMs = readEnvNumber('SYNC_INTERVAL_MS', DEFAULT_SYNC_INTERVAL_MS)
        const checkIntervalMs = readEnvNumber('SYNC_CHECK_INTERVAL_MS', DEFAULT_CHECK_INTERVAL_MS)

        console.log(`[sync] Batch synthetic quotes for all eligible stocks. Sync every ${syncIntervalMs / 1000}s, check every ${checkIntervalMs / 1000}s`)

        for (;;) {
            await this.runDueTick()
            await sleep(checkIntervalMs)
        }
    }
}
