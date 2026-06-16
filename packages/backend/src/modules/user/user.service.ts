import { and, asc, eq, ilike, or } from 'drizzle-orm';

import type { AppVars } from '../../context.ts';
import { user } from '../../db/schema/auth-schema.ts';
import { trade } from '../../db/schema/trade/trade.ts';

export type UserProfile = {
  userId: string;
  name: string;
  cashBalance: number;
  netWorth: number;
  startingCapital: number;
  isDefaulted: boolean;
  penaltyCounter: number;
  rank: number | null;
};

export type UserSearchResult = {
  userId: string;
  name: string;
  rank: number | null;
  netWorth: number | null;
};

export type PerformancePoint = {
  date: string;
  value: number;
};

export class UserService {
  constructor(private readonly ctx: AppVars) {}

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const [authUser] = await this.ctx.db
      .select({ id: user.id, name: user.name })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!authUser) return null;

    const activePortfolio = await this.ctx.portfolioService.getActiveForUser(userId);
    const penaltyCounter = await this.ctx.portfolioService.getDefaultCount(userId);
    const rank = await this.ctx.leaderboardService.getRankForUser(userId);

    if (!activePortfolio) {
      return {
        userId,
        name: authUser.name,
        cashBalance: 0,
        netWorth: 0,
        startingCapital: 0,
        isDefaulted: true,
        penaltyCounter,
        rank: null,
      };
    }

    const [netWorth] = await Promise.all([
      this.ctx.portfolioService.getNetWorth(activePortfolio.id),
    ]);

    return {
      userId,
      name: authUser.name,
      cashBalance: parseFloat(activePortfolio.cashBalance),
      netWorth,
      startingCapital: parseFloat(activePortfolio.startingCapital),
      isDefaulted: false,
      penaltyCounter,
      rank,
    };
  }

  async getUserNetworth(userId: string): Promise<number> {
    const activePortfolio = await this.ctx.portfolioService.getActiveForUser(userId);
    if (!activePortfolio) return 0;
    return this.ctx.portfolioService.getNetWorth(activePortfolio.id);
  }

  async searchUsers(query: string, limit: number): Promise<UserSearchResult[]> {
    const pattern = `%${query.trim()}%`;
    const matches = await this.ctx.db
      .select({ id: user.id, name: user.name })
      .from(user)
      .where(or(ilike(user.name, pattern), ilike(user.email, pattern)))
      .limit(limit);

    const results: UserSearchResult[] = [];
    for (const match of matches) {
      const profile = await this.getUserProfile(match.id);
      results.push({
        userId: match.id,
        name: match.name,
        rank: profile?.rank ?? null,
        netWorth: profile !== null && !profile.isDefaulted ? profile.netWorth : null,
      });
    }

    return results;
  }

  async getUserPerformance(userId: string): Promise<PerformancePoint[]> {
    const activePortfolio = await this.ctx.portfolioService.getActiveForUser(userId);
    if (!activePortfolio) return [];

    const startingCapital = parseFloat(activePortfolio.startingCapital);
    const startDate = activePortfolio.createdAt.toISOString().slice(0, 10);

    const trades = await this.ctx.db
      .select()
      .from(trade)
      .where(and(eq(trade.portfolioId, activePortfolio.id), eq(trade.status, 'EXECUTED')))
      .orderBy(asc(trade.executedAt));

    const points: PerformancePoint[] = [{ date: startDate, value: startingCapital }];

    let cash = startingCapital;
    const holdings = new Map<string, number>();

    for (const t of trades) {
      const price = parseFloat(t.executedPrice);
      const qty = t.quantity;

      if (t.tradeType === 'BUY') {
        cash -= qty * price;
        holdings.set(t.stockId, (holdings.get(t.stockId) ?? 0) + qty);
      } else {
        cash += qty * price;
        holdings.set(t.stockId, (holdings.get(t.stockId) ?? 0) - qty);
      }

      let holdingsValue = 0;
      for (const [stockId, quantity] of holdings) {
        if (quantity <= 0) continue;
        const currentPrice = await this.ctx.stockService.getLatestPriceByStockId(stockId);
        if (currentPrice !== null) {
          holdingsValue += quantity * currentPrice;
        }
      }

      const executedAt = t.executedAt ?? t.createdAt;
      points.push({
        date: executedAt.toISOString().slice(0, 10),
        value: cash + holdingsValue,
      });
    }

    const currentNetWorth = await this.ctx.portfolioService.getNetWorth(activePortfolio.id);
    const today = new Date().toISOString().slice(0, 10);
    const last = points[points.length - 1];

    if (last && last.date === today) {
      points[points.length - 1] = { date: today, value: currentNetWorth };
    } else {
      points.push({ date: today, value: currentNetWorth });
    }

    return points;
  }
}
