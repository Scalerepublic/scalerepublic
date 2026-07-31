/**
 * Purpose: Derive holdings and summary view models from a portfolio API response.
 */
import type { ApiPortfolio, HoldingWithMarket, PortfolioSummary } from '$lib/types';

function mapHoldings(portfolio: ApiPortfolio): HoldingWithMarket[] {
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

function mapSummary(
	portfolio: ApiPortfolio | null | undefined,
	holdings: HoldingWithMarket[]
): PortfolioSummary {
	const cashBalance = portfolio?.cashBalance ?? 0;
	const startingCapital = portfolio?.startingCapital ?? 0;
	const holdingsValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
	const totalValue = holdingsValue + cashBalance;
	const totalPnl = totalValue - startingCapital;

	return {
		totalValue,
		holdingsValue,
		cashBalance,
		totalPnl,
		totalPnlPercent: startingCapital > 0 ? (totalPnl / startingCapital) * 100 : 0,
		dayChange: 0,
		dayChangePercent: 0
	};
}

export function portfolioView(portfolio: ApiPortfolio | null | undefined): {
	holdings: HoldingWithMarket[];
	summary: PortfolioSummary;
} {
	const holdings = portfolio ? mapHoldings(portfolio) : [];
	return { holdings, summary: mapSummary(portfolio, holdings) };
}
