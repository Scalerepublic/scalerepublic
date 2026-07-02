import { desc, eq } from 'drizzle-orm';

import type { AppVars } from '../../context.ts';
import { user } from '../../db/schema/auth-schema.ts';
import { portfolio } from '../../db/schema/portfolio/portfolio.ts';

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  name: string;
  cashBalance: number;
  portfolioValue: number;
  netWorth: number;
  startingCapital: number;
  penaltyCounter: number;
  lastDefaultedAt: string | null;
  isDefaulted: boolean;
};

export class LeaderboardService {
  constructor(private readonly ctx: AppVars) {}

  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    const activePortfolios = await this.ctx.db
      .select({
        portfolioId: portfolio.id,
        userId: portfolio.userId,
        cashBalance: portfolio.cashBalance,
        startingCapital: portfolio.startingCapital,
        userName: user.name,
      })
      .from(portfolio)
      .innerJoin(user, eq(portfolio.userId, user.id))
      .where(eq(portfolio.status, 'ACTIVE'))
      .orderBy(desc(portfolio.createdAt));

    const latestByUser = new Map<string, (typeof activePortfolios)[number]>();
    for (const row of activePortfolios) {
      if (!latestByUser.has(row.userId)) {
        latestByUser.set(row.userId, row);
      }
    }

    const entries: Omit<LeaderboardEntry, 'rank'>[] = [];
    const portfolioRows = [...latestByUser.values()];
    const portfolioIds = portfolioRows.map((row) => row.portfolioId);
    const holdingsByPortfolio = await this.ctx.tradesService.getHoldingsByPortfolioIds(portfolioIds);
    const stockIds = new Set<string>();

    for (const holdings of holdingsByPortfolio.values()) {
      for (const holding of holdings) {
        stockIds.add(holding.stockId);
      }
    }

    const latestPrices = await this.ctx.stockService.getLatestPricesByStockIds([...stockIds]);

    for (const row of portfolioRows) {
      const holdings = holdingsByPortfolio.get(row.portfolioId) ?? [];
      let portfolioValue = 0;

      for (const holding of holdings) {
        const price = latestPrices.get(holding.stockId);
        if (price !== undefined) {
          portfolioValue += holding.quantity * price;
        }
      }

      const [penaltyCounter, lastDefaultedAt] = await Promise.all([
        this.ctx.portfolioService.getDefaultCount(row.userId),
        this.ctx.portfolioService.getLastDefaultedAt(row.userId),
      ]);

      const cashBalance = parseFloat(row.cashBalance);
      const startingCapital = parseFloat(row.startingCapital);

      entries.push({
        userId: row.userId,
        name: row.userName,
        cashBalance,
        portfolioValue,
        netWorth: cashBalance + portfolioValue,
        startingCapital,
        penaltyCounter,
        lastDefaultedAt: lastDefaultedAt?.toISOString() ?? null,
        isDefaulted: false,
      });
    }

    return entries
      .sort((a, b) => b.netWorth - a.netWorth)
      .map((entry, index) => ({
        rank: index + 1,
        ...entry,
      }));
  }

  async getRankForUser(userId: string): Promise<number | null> {
    const leaderboard = await this.getLeaderboard();
    const entry = leaderboard.find((row) => row.userId === userId);
    return entry?.rank ?? null;
  }
}
