import os from 'node:os'

import { and, eq, lt, or } from 'drizzle-orm'
import { z } from 'zod'

import type { AppVars } from '../../context.ts'
import { syncJob } from '../../db/schema/sync.ts'
import { isMarketDebugEnabled } from '../../lib/market-debug.ts'

const JOB_ID = 'stock-price-sync'
const DEFAULT_SYNC_INTERVAL_MS = 60 * 60 * 1000
const DEFAULT_CHECK_INTERVAL_MS = 60 * 1000
const RATE_LIMIT_BATCH_SIZE = 5
const RATE_LIMIT_WINDOW_MS = 1000
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
    private readonly lockId = `${os.hostname()}:${process.pid}`

    constructor(private readonly ctx: AppVars) {}

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

    private async syncTicker(ticker: string): Promise<void> {
        const stockId = await this.ensureStock(ticker)
        if (stockId === null) return

        const quote = await this.ctx.stockDataClient.getQuote(ticker)
        await this.ctx.stockService.insertPrice(stockId, quote.price, this.ctx.stockDataClient.source, new Date())

        console.log(`[sync] ${ticker}: ${quote.price} (${quote.tradingDay.toISOString().slice(0, 10)})`)
    }

    private async runSync(tickers: string[]): Promise<void> {
        if (isMarketDebugEnabled()) {
            console.log('[sync] Skipping external price sync while STOCK_DEBUG=true')
            return
        }

        const batches = chunk(tickers, RATE_LIMIT_BATCH_SIZE)
        for (let i = 0; i < batches.length; i++) {
            if (i > 0) await sleep(RATE_LIMIT_WINDOW_MS)
            const results = await Promise.allSettled(batches[i]!.map(t => this.syncTicker(t)))
            results.forEach((r, j) => {
                if (r.status === 'rejected') {
                    console.error(`[sync] ${batches[i]![j]} failed: ${r.reason instanceof Error ? r.reason.message : r.reason}`)
                }
            })
        }
    }

    private async isSyncDue(syncDueThreshold: Date): Promise<boolean> {
        console.log('[sync] Checking if sync is due')
        const row = await this.ctx.db
            .select({ lastSuccessAt: syncJob.lastSuccessAt })
            .from(syncJob)
            .where(eq(syncJob.id, JOB_ID))
            .limit(1)
        const lastSuccessAt = row[0]?.lastSuccessAt
        return !lastSuccessAt || lastSuccessAt < syncDueThreshold
    }

    private async tryClaimJob(staleThreshold: Date): Promise<boolean> {
        // Atomic write to make sure only one instance/container can acquire the lock
        // and run the sync at a time.
        const claimed = await this.ctx.db.update(syncJob).set({
            status: 'running',
            lockedAt: new Date(),
            lockedBy: this.lockId,
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

    /**
     * Runs a single scheduler tick: claims the DB lock, syncs if due, and
     * releases the lock. Safe to invoke from a Cloudflare Cron Trigger
     * (scheduled handler) or from the local polling loop. The DB advisory lock
     * guards against overlapping runs.
     */
    async runDueTick(tickers: string[]): Promise<void> {
        const syncIntervalMs = Number(process.env['SYNC_INTERVAL_MS'] ?? DEFAULT_SYNC_INTERVAL_MS)

        await this.ctx.db.insert(syncJob).values({ id: JOB_ID }).onConflictDoNothing()

        try {
            const staleThreshold = new Date(Date.now() - STALE_LOCK_MS)
            const syncDueThreshold = new Date(Date.now() - syncIntervalMs)

            if (!await this.isSyncDue(syncDueThreshold)) return
            if (!await this.tryClaimJob(staleThreshold)) {
                console.log('[sync] Failed to lock sync')
                return
            }
            console.log(`[sync] Lock acquired by ${this.lockId}`)

            try {
                await this.runSync(tickers)
                await this.ctx.db.update(syncJob).set({
                    status: 'idle',
                    lastSuccessAt: new Date(),
                    lastError: null,
                    lockedAt: null,
                    lockedBy: null,
                }).where(eq(syncJob.id, JOB_ID))
                console.log('[sync] Completed successfully')
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

    /**
     * Local/Bun-only polling loop. On Cloudflare Workers this is replaced by a
     * Cron Trigger that calls {@link runDueTick} directly.
     */
    async startScheduler(): Promise<void> {
        const tickers = parseTrackedTickers()
        const syncIntervalMs = Number(process.env['SYNC_INTERVAL_MS'] ?? DEFAULT_SYNC_INTERVAL_MS)
        const checkIntervalMs = Number(process.env['SYNC_CHECK_INTERVAL_MS'] ?? DEFAULT_CHECK_INTERVAL_MS)

        console.log(`[sync] Tracking: ${tickers.join(', ')}. Sync every ${syncIntervalMs / 1000}s, check every ${checkIntervalMs / 1000}s`)

        for (;;) {
            await this.runDueTick(tickers)
            await sleep(checkIntervalMs)
        }
    }
}
