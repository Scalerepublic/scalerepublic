import type {
	BackendLeaderboardEntry,
	BackendPortfolioPayload,
	BackendStockSummary,
	BackendUserProfile
} from '$lib/api/backend-types';
import type {
	ApiLeaderboardEntry,
	ApiPortfolio,
	HoldingWithMarket,
	Stock,
	UserProfile
} from '$lib/types';

function normalizeExchange(exchange: string): string | undefined {
	const trimmed = exchange.trim();
	if (!trimmed || trimmed.toUpperCase() === 'UNKNOWN') return undefined;
	return trimmed;
}

export function mapStockSummary(row: BackendStockSummary): Stock {
	const price = row.latestPrice ?? 0;
	const previousClose = row.previousClose ?? price;
	const dayChange = price - previousClose;
	const dayChangePercent = previousClose > 0 ? (dayChange / previousClose) * 100 : 0;

	return {
		id: row.id,
		ticker: row.ticker,
		name: row.companyName,
		sector: '',
		exchange: normalizeExchange(row.exchange),
		currentPrice: price,
		previousClose,
		dayChange,
		dayChangePercent
	};
}

export function mapPortfolioPayload(payload: BackendPortfolioPayload): ApiPortfolio {
	return {
		portfolioId: payload.portfolio.id,
		cashBalance: parseFloat(payload.portfolio.cashBalance),
		startingCapital: parseFloat(payload.portfolio.startingCapital),
		status: payload.portfolio.status,
		holdings: payload.holdings.map((h) => ({
			stockId: h.stockId,
			ticker: h.ticker,
			companyName: h.ticker,
			shares: h.quantity,
			avgCost: h.avgCost,
			currentPrice: h.currentPrice
		}))
	};
}

export function mapTraderHoldings(portfolio: ApiPortfolio): HoldingWithMarket[] {
	return portfolio.holdings.map((h) => {
		const currentPrice = h.currentPrice ?? 0;
		const currentValue = currentPrice * h.shares;
		const totalCost = h.avgCost * h.shares;
		const pnl = currentValue - totalCost;

		return {
			ticker: h.ticker,
			shares: h.shares,
			avgCost: h.avgCost,
			stock: {
				id: h.stockId,
				ticker: h.ticker,
				name: h.companyName || h.ticker,
				sector: '',
				currentPrice,
				previousClose: currentPrice,
				dayChange: 0,
				dayChangePercent: 0
			},
			currentValue,
			totalCost,
			pnl,
			pnlPercent: totalCost > 0 ? (pnl / totalCost) * 100 : 0
		};
	});
}

export function mapTraderSummary(portfolio: ApiPortfolio, holdings: HoldingWithMarket[]) {
	const holdingsValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
	const totalValue = holdingsValue + portfolio.cashBalance;
	const totalPnl = totalValue - portfolio.startingCapital;

	return {
		totalValue,
		holdingsValue,
		cashBalance: portfolio.cashBalance,
		totalPnl,
		totalPnlPercent:
			portfolio.startingCapital > 0 ? (totalPnl / portfolio.startingCapital) * 100 : 0
	};
}

export function mapLeaderboardEntry(entry: BackendLeaderboardEntry): ApiLeaderboardEntry {
	const startingCapital = entry.startingCapital;
	const holdingsValue = entry.portfolioValue;
	const returnPercent =
		startingCapital > 0 ? ((entry.netWorth - startingCapital) / startingCapital) * 100 : 0;

	return {
		rank: entry.rank,
		userId: entry.userId,
		name: entry.name,
		netWorth: entry.netWorth,
		cashBalance: entry.cashBalance,
		holdingsValue,
		returnPercent,
		penalties: entry.penaltyCounter,
		lastDefaultedAt: entry.lastDefaultedAt
	};
}

export function mergeUserProfile(
	base: UserProfile,
	backend: BackendUserProfile | null
): UserProfile {
	if (!backend) return base;

	return {
		...base,
		name: backend.name || base.name,
		startingCapital: backend.startingCapital,
		accountStatus: backend.isDefaulted ? 'suspended' : 'active',
		rank: backend.rank ?? undefined,
		penaltyCounter: backend.penaltyCounter
	};
}
