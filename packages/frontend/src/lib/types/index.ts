export interface Stock {
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
	startingCapital: number;
	accountStatus: 'active' | 'suspended';
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
