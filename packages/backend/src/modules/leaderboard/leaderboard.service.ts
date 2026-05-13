export type LeaderboardEntry = {
  rank: number;
  userId: string;
  name: string;
  cashBalance: number;
  portfolioValue: number;
  netWorth: number;
  isDefaulted: boolean;
};

export class LeaderboardService {
  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    //fake-User
    const users = [
      {
        userId: "user-1",
        name: "Alice",
        cashBalance: 100_000,
        portfolioValue: 50_000,
        isDefaulted: false,
        penaltyCounter: 2,
      },
      {
        userId: "user-2",
        name: "Bob",
        cashBalance: 80_000,
        portfolioValue: 10_000,
        isDefaulted: false,
        penaltyCounter: 2,
      },
      {
        userId: "user-3",
        name: "Charlie",
        cashBalance: 20_000,
        portfolioValue: 5_000,
        isDefaulted: true,
        penaltyCounter: 2,
      },
    ];

    return users
      .map((user) => ({
        ...user,
        netWorth: user.cashBalance + user.portfolioValue,
      }))
      .sort((a, b) => b.netWorth - a.netWorth)
      .map((user, index) => ({
        rank: index + 1,
        ...user,
      }));
  }
}