import { and, eq, lt, or } from 'drizzle-orm'
import { z } from 'zod'

import type { AppVars } from '../../context.ts'
import { syncJob } from '../../db/schema/sync.ts'
import { readEnvNumber } from '../../lib/env-number.ts'
import { isMarketDebugEnabled } from '../../lib/market-debug.ts'

const JOB_ID = 'stock-price-sync'
const DEFAULT_SYNC_INTERVAL_MS = 60 * 60 * 1000
const DEFAULT_CHECK_INTERVAL_MS = 60 * 1000
const RATE_LIMIT_BATCH_SIZE = 5
const RATE_LIMIT_WINDOW_MS = 1000
const CATALOG_BACKFILL_BATCH_SIZE = 5
const CATALOG_BACKFILL_BATCH_INTERVAL_MS = 5000
const DEFAULT_NAMES_BACKFILL_BATCH = 20
const DEFAULT_HISTORY_BACKFILL_STOCKS = 8
const DEFAULT_HISTORY_BARS_PER_STOCK = 10
const DEFAULT_MAX_UNI_API_CALLS_PER_TICK = 55
const AUTO_TRADE_BATCH_SIZE = 20
// Time after which a new instance is allowed to retake a taken lock
// Essentially the maximum time the sync should take. Longer and we
// assume another instance crashed while holding the lock
const STALE_LOCK_MS = 10 * 60 * 1000

const DEFAULT_TICKERS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'JPM', 'V', 'UNH']

const TickerSchema = z.string().regex(/^[A-Z]{1,5}$/, 'must be 1–5 uppercase letters')

export const parseTrackedTickers = (): string[] => {
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

const chunk = <T>(arr: T[], size: number): T[][] => {
    const out: T[][] = []
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
    return out
}

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

export class SyncService {
    private lockId: string | null = null

    constructor(private readonly ctx: AppVars) {}

    private getLockId(): string {
        this.lockId ??= `sync-${crypto.randomUUID()}`
        return this.lockId
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

        const quote = await this.ctx.stockDataClient.getQuote(ticker)
        await this.ctx.stockService.insertPrice(stockId, quote.price, this.ctx.stockDataClient.source, new Date())
        await this.ctx.stockService.ensureDailyBarHistory(stockId, ticker)
        await this.ctx.stockService.refreshStockMetrics(stockId)

        console.log(`[sync] ${ticker}: ${quote.price} (${quote.tradingDay.toISOString().slice(0, 10)})`)
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
        const batches = chunk(tickers, RATE_LIMIT_BATCH_SIZE)
        for (let i = 0; i < batches.length; i++) {
            if (i > 0) await sleep(RATE_LIMIT_WINDOW_MS)
            const results = await Promise.allSettled(batches[i]!.map(t => this.syncTicker(t)))
            results.forEach((r, j) => {
                if (r.status === 'fulfilled' && r.value) {
                    succeeded += 1
                    return
                }
                if (r.status === 'rejected') {
                    console.error(`[sync] ${batches[i]![j]} failed: ${r.reason instanceof Error ? r.reason.message : r.reason}`)
                }
            })
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

    async syncOnce(tickers: string[]): Promise<void> {
        await this.runSync(tickers)
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

    async runDueTick(tickers: string[]): Promise<void> {
        const syncIntervalMs = readEnvNumber('SYNC_INTERVAL_MS', DEFAULT_SYNC_INTERVAL_MS)

        try {
            await this.ctx.db.insert(syncJob).values({ id: JOB_ID }).onConflictDoNothing()

            const staleThreshold = new Date(Date.now() - STALE_LOCK_MS)
            const syncDueThreshold = new Date(Date.now() - syncIntervalMs)

            if (!await this.isSyncDue(syncDueThreshold)) return
            if (!await this.tryClaimJob(staleThreshold)) {
                console.log('[sync] Failed to lock sync')
                return
            }
            console.log(`[sync] Lock acquired by ${this.getLockId()}`)

            try {
                let syncError: string | null = null
                try {
                    await this.runSync(tickers)
                } catch (err) {
                    syncError = err instanceof Error ? err.message : String(err)
                    console.error(`[sync] Price sync failed: ${syncError}`)
                }

                try {
                    await this.runCatalogBackfill()
                } catch (err) {
                    const message = err instanceof Error ? err.message : String(err)
                    console.error(`[sync/backfill] Failed: ${message}`)
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
                console.log('[sync] Completed successfully')
                // Auto-trades first (they move cash/holdings), then defaults on the result.
                await this.checkAllAutoTrades()
                await this.ctx.portfolioDefaultService.checkAllActivePortfolios()
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
        const tickers = parseTrackedTickers()
        const syncIntervalMs = readEnvNumber('SYNC_INTERVAL_MS', DEFAULT_SYNC_INTERVAL_MS)
        const checkIntervalMs = readEnvNumber('SYNC_CHECK_INTERVAL_MS', DEFAULT_CHECK_INTERVAL_MS)

        console.log(`[sync] Tracking: ${tickers.join(', ')}. Sync every ${syncIntervalMs / 1000}s, check every ${checkIntervalMs / 1000}s`)

        for (;;) {
            await this.runDueTick(tickers)
            await sleep(checkIntervalMs)
        }
    }
}
