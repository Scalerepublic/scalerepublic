import type {
	BackendLeaderboardEntry,
	BackendPortfolioPayload,
	BackendStockSummary,
	BackendUserProfile
} from '$lib/api/backend-types';
import type { ApiLeaderboardEntry, ApiPortfolio, Stock, UserProfile } from '$lib/types';

function normalizeExchange(exchange: string): string | undefined {
	const trimmed = exchange.trim();
	if (!trimmed || trimmed.toUpperCase() === 'UNKNOWN') return undefined;
	return trimmed;
}

export function mapStockSummary(row: BackendStockSummary): Stock {
	const price = row.latestPrice ?? 0;

	return {
		id: row.id,
		ticker: row.ticker,
		name: row.companyName,
		sector: '',
		exchange: normalizeExchange(row.exchange),
		currentPrice: price,
		previousClose: price,
		dayChange: 0,
		dayChangePercent: 0
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
