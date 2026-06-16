import { error } from '@sveltejs/kit';
import { api, parseApiData } from '$lib/api/client';
import type {
	BackendPerformancePoint,
	BackendPortfolioPayload,
	BackendUserProfile
} from '$lib/api/backend-types';
import { mapPortfolioPayload } from '$lib/api/mappers';
import type { HoldingWithMarket } from '$lib/types';
import type { PerformancePoint } from '$lib/performance-history';

function mapHoldings(payload: ReturnType<typeof mapPortfolioPayload>): HoldingWithMarket[] {
	return payload.holdings.map((h) => {
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

export async function load({ params }: { params: { id: string } }) {
	try {
		const [profileRes, portfolioRes, performanceRes] = await Promise.all([
			api.api.v1.users[':id'].$get({ param: { id: params.id } }),
			api.api.v1.users[':id'].portfolio.$get({ param: { id: params.id } }),
			api.api.v1.users[':id'].performance.$get({ param: { id: params.id } })
		]);

		const profile = await parseApiData<BackendUserProfile>(profileRes);
		const portfolioPayload = await parseApiData<BackendPortfolioPayload>(portfolioRes);
		const performance = await parseApiData<BackendPerformancePoint[]>(performanceRes);

		const portfolio = mapPortfolioPayload(portfolioPayload);
		const holdings = mapHoldings(portfolio);
		const holdingsValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
		const totalValue = holdingsValue + portfolio.cashBalance;
		const totalPnl = totalValue - portfolio.startingCapital;

		return {
			profile,
			portfolio,
			holdings,
			performance: performance as PerformancePoint[],
			summary: {
				totalValue,
				holdingsValue,
				cashBalance: portfolio.cashBalance,
				totalPnl,
				totalPnlPercent:
					portfolio.startingCapital > 0 ? (totalPnl / portfolio.startingCapital) * 100 : 0
			}
		};
	} catch {
		error(404, 'Trader not found');
	}
}
