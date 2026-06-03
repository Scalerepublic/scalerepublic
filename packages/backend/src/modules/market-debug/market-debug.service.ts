import { stepGbm } from '../../db/seed/gbm.ts';
import { ARCHETYPES, SEED_STOCKS, type Archetype } from '../../db/seed/stocks.ts';
import type { AppVars } from '../../context.ts';

const DEFAULT_ARCHETYPE: Archetype = 'steady_growth';
const archetypeByTicker = Object.fromEntries(
    SEED_STOCKS.map((s) => [s.ticker, s.archetype]),
) as Record<string, Archetype>;

const initialPriceByTicker = Object.fromEntries(
    SEED_STOCKS.map((s) => [s.ticker, s.initialPrice]),
) as Record<string, number>;

export class MarketDebugService {
    private dayOffset = 0;
    private ticksOnCurrentDay = 0;

    constructor(private readonly ctx: AppVars) {}

    getDayOffset(): number {
        return this.dayOffset;
    }

    getMarketDate(): Date {
        const d = new Date();
        d.setUTCHours(0, 0, 0, 0);
        d.setUTCDate(d.getUTCDate() + this.dayOffset);
        return d;
    }

    getMarketDateIso(): string {
        return this.getMarketDate().toISOString().slice(0, 10);
    }

    getAsOf(): Date {
        const d = this.getMarketDate();
        d.setUTCHours(23, 59, 59, 999);
        return d;
    }

    advanceDay(): { marketDate: string; dayOffset: number } {
        this.dayOffset += 1;
        this.ticksOnCurrentDay = 0;
        return this.status();
    }

    retreatDay(): { marketDate: string; dayOffset: number } {
        this.dayOffset -= 1;
        this.ticksOnCurrentDay = 0;
        return this.status();
    }

    status(): { marketDate: string; dayOffset: number } {
        return { marketDate: this.getMarketDateIso(), dayOffset: this.dayOffset };
    }

    async applyGbmTick(): Promise<{ marketDate: string; updated: number }> {
        const stocks = await this.ctx.stockService.getAll();
        const recordedAt = this.nextRecordedAt();
        let updated = 0;

        for (let i = 0; i < stocks.length; i++) {
            const row = stocks[i]!;
            const archetype = archetypeByTicker[row.ticker] ?? DEFAULT_ARCHETYPE;
            const { drift, volatility } = ARCHETYPES[archetype];
            const current =
                row.latestPrice ??
                initialPriceByTicker[row.ticker] ??
                100;
            let seed =
                (this.dayOffset * 9973 +
                    this.ticksOnCurrentDay * 101 +
                    i * 17 +
                    row.ticker.charCodeAt(0)) %
                2147483647;
            const rng = () => {
                seed = (seed * 16807) % 2147483647;
                return seed / 2147483647;
            };
            const next = stepGbm(current, drift, volatility, rng);
            await this.ctx.stockService.insertPrice(row.id, next, 'debug_gbm', recordedAt);
            updated += 1;
        }

        this.ticksOnCurrentDay += 1;
        return { marketDate: this.getMarketDateIso(), updated };
    }

    private nextRecordedAt(): Date {
        const d = this.getMarketDate();
        d.setUTCHours(10 + this.ticksOnCurrentDay, 0, 0, 0);
        return d;
    }
}
