import { eq, ilike, or } from 'drizzle-orm';

import type { AppVars } from '../../context.ts';
import { user } from '../../db/schema/auth-schema.ts';
import type { PerformanceGranularity, PerformancePoint } from '../portfolio/portfolio-performance.service.ts';

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

export type { PerformancePoint } from '../portfolio/portfolio-performance.service.ts';
export type { PerformanceGranularity } from '../portfolio/portfolio-performance.service.ts';

export class UserService {
  constructor(private readonly ctx: AppVars) {}

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const [authUser] = await this.ctx.db
      .select({ id: user.id, name: user.name })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!authUser) return null;

    const [activePortfolio, penaltyCounter, rank] = await Promise.all([
      this.ctx.portfolioService.getActiveForUser(userId),
      this.ctx.portfolioService.getDefaultCount(userId),
      this.ctx.leaderboardService.getRankForUser(userId),
    ]);

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

    const netWorth = await this.ctx.portfolioService.getNetWorth(activePortfolio.id);

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

    if (matches.length === 0) {
      return [];
    }

    const leaderboard = await this.ctx.leaderboardService.getLeaderboard();
    const rankByUser = new Map(leaderboard.map((entry) => [entry.userId, entry.rank]));
    const netWorthByUser = new Map(leaderboard.map((entry) => [entry.userId, entry.netWorth]));

    return matches.map((match) => ({
      userId: match.id,
      name: match.name,
      rank: rankByUser.get(match.id) ?? null,
      netWorth: netWorthByUser.get(match.id) ?? null,
    }));
  }

  async getUserPerformance(
    userId: string,
    granularity: PerformanceGranularity = 'daily',
  ): Promise<PerformancePoint[]> {
    const activePortfolio = await this.ctx.portfolioService.getActiveForUser(userId);
    if (!activePortfolio) return [];

    return this.ctx.portfolioPerformanceService.getPerformance(activePortfolio.id, granularity);
  }
}
