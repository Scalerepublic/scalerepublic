/**
 * Purpose: Translate backend transport objects into the view models consumed by Svelte components.
 */
import type {
	BackendLeaderboardEntry,
	BackendPortfolioPayload,
	BackendStockSummary
} from '$lib/api/backend-types';
import { periodChangeToAmount } from '$lib/stock-performance';
import type { Stock } from '$lib/types';

export type ApiPortfolio = ReturnType<typeof mapPortfolioPayload>;
export type ApiHolding = ApiPortfolio['holdings'][number];
export type ApiLeaderboardEntry = ReturnType<typeof mapLeaderboardEntry>;

function normalizeExchange(exchange: string): string | undefined {
	const trimmed = exchange.trim();
	if (!trimmed || trimmed.toUpperCase() === 'UNKNOWN') return undefined;
	return trimmed;
}

export function mapStockSummary(row: BackendStockSummary): Stock {
	const price = row.latestPrice ?? 0;
	const previousClose = row.previousClose ?? price;
	const dayChange = row.dayChange ?? price - previousClose;
	const dayChangePercent =
		row.dayChangePercent ?? (previousClose > 0 ? (dayChange / previousClose) * 100 : 0);
	const periodChangePercent = row.periodChangePercent ?? null;
	const displayPercent = periodChangePercent ?? dayChangePercent;
	const displayChange =
		periodChangePercent !== null ? periodChangeToAmount(price, periodChangePercent) : dayChange;

	return {
		id: row.id,
		ticker: row.ticker,
		name: row.companyName,
		sector: '',
		exchange: normalizeExchange(row.exchange),
		currentPrice: price,
		previousClose,
		dayChange: displayChange,
		dayChangePercent: displayPercent,
		periodChangePercent
	};
}

export function mapPortfolioPayload(payload: BackendPortfolioPayload) {
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

export function mapLeaderboardEntry(entry: BackendLeaderboardEntry) {
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
