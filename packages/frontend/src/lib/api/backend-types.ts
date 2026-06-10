export type BackendStockSummary = {
	id: string;
	ticker: string;
	companyName: string;
	exchange: string;
	currency: string;
	latestPrice: number | null;
};

export type BackendPortfolioRow = {
	id: string;
	userId: string;
	cashBalance: string;
	startingCapital: string;
	status: 'ACTIVE' | 'DEFAULTED';
	defaultedAt: Date | string | null;
	createdAt: Date | string;
	updatedAt: Date | string;
};

export type BackendPortfolioPosition = {
	stockId: string;
	ticker: string;
	quantity: number;
	avgCost: number;
	currentPrice: number | null;
	marketValue: number | null;
};

export type BackendPortfolioPayload = {
	portfolio: BackendPortfolioRow;
	holdings: BackendPortfolioPosition[];
	portfolioValue: number;
};

export type BackendLeaderboardEntry = {
	rank: number;
	userId: string;
	name: string;
	cashBalance: number;
	portfolioValue: number;
	netWorth: number;
	isDefaulted: boolean;
};

export type BackendUserProfile = {
	userId: string;
	name: string;
	cashBalance: number;
	isDefaulted: boolean;
	penaltyCounter: number;
};
