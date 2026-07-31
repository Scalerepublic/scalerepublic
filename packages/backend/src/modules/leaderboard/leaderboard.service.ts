import { and, count, desc, eq, inArray, max } from 'drizzle-orm';

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

const LEADERBOARD_CACHE_TTL_MS = 30_000;

let leaderboardCache: { expiresAt: number; entries: LeaderboardEntry[] } | null = null;

export class LeaderboardService {
  constructor(private readonly ctx: AppVars) {}

  private async getDefaultStatsByUserIds(
    userIds: string[],
  ): Promise<Map<string, { penaltyCounter: number; lastDefaultedAt: Date | null }>> {
    if (userIds.length === 0) {
      return new Map();
    }

    const rows = await this.ctx.db
      .select({
        userId: portfolio.userId,
        penaltyCounter: count(),
        lastDefaultedAt: max(portfolio.defaultedAt),
      })
      .from(portfolio)
      .where(and(inArray(portfolio.userId, userIds), eq(portfolio.status, 'DEFAULTED')))
      .groupBy(portfolio.userId);

    return new Map(
      rows.map((row) => [
        row.userId,
        {
          penaltyCounter: row.penaltyCounter,
          lastDefaultedAt: row.lastDefaultedAt,
        },
      ]),
    );
  }

  private async buildLeaderboard(): Promise<LeaderboardEntry[]> {
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
    const userIds = portfolioRows.map((row) => row.userId);
    const defaultStats = await this.getDefaultStatsByUserIds(userIds);

    for (const row of portfolioRows) {
      const holdings = holdingsByPortfolio.get(row.portfolioId) ?? [];
      let portfolioValue = 0;

      for (const holding of holdings) {
        const price = latestPrices.get(holding.stockId);
        if (price !== undefined) {
          portfolioValue += holding.quantity * price;
        }
      }

      const stats = defaultStats.get(row.userId);
      const penaltyCounter = stats?.penaltyCounter ?? 0;
      const lastDefaultedAt = stats?.lastDefaultedAt ?? null;

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

  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    if (leaderboardCache && Date.now() < leaderboardCache.expiresAt) {
      return leaderboardCache.entries;
    }

    const entries = await this.buildLeaderboard();
    leaderboardCache = {
      expiresAt: Date.now() + LEADERBOARD_CACHE_TTL_MS,
      entries,
    };
    return entries;
  }

  async getRankForUser(userId: string): Promise<number | null> {
    const leaderboard = await this.getLeaderboard();
    const entry = leaderboard.find((row) => row.userId === userId);
    return entry?.rank ?? null;
  }
}
