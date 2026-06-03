export interface Stock {
	id: string;
	ticker: string;
	name: string;
	sector: string;
	currentPrice: number;
	previousClose: number;
	dayChange: number;
	dayChangePercent: number;
	marketCap?: number;
	volume?: number;
}

export interface Holding {
	ticker: string;
	shares: number;
	avgCost: number;
}

export interface HoldingWithMarket extends Holding {
	stock: Stock;
	currentValue: number;
	totalCost: number;
	pnl: number;
	pnlPercent: number;
}

export interface PortfolioSummary {
	totalValue: number;
	holdingsValue: number;
	cashBalance: number;
	totalPnl: number;
	totalPnlPercent: number;
	dayChange: number;
	dayChangePercent: number;
}

export interface UserProfile {
	id: string;
	name: string;
	email: string;
	/** Populated once backend exposes portfolio endpoint. */
	startingCapital?: number;
	/** Populated once backend exposes portfolio endpoint. */
	accountStatus?: 'active' | 'suspended';
	joinedAt: string;
	avatarUrl: string | null;
	rank?: number;
}

export interface AppSettings {
	theme: 'light' | 'dark' | 'system';
	notifications: {
		priceAlerts: boolean;
		tradeConfirmations: boolean;
		weeklyReport: boolean;
	};
}

export interface ApiHolding {
	stockId: string;
	ticker: string;
	companyName: string;
	shares: number;
	avgCost: number;
	currentPrice: number | null;
}

export interface ApiPortfolio {
	portfolioId: string;
	cashBalance: number;
	startingCapital: number;
	status: 'ACTIVE' | 'DEFAULTED';
	holdings: ApiHolding[];
}

export interface ApiLeaderboardEntry {
	rank: number;
	userId: string;
	name: string;
	netWorth: number;
	cashBalance: number;
	holdingsValue: number;
	returnPercent: number;
	penalties: number;
	lastDefaultedAt: string | null;
}
