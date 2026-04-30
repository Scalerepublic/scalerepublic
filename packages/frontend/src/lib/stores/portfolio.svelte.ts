import { mockHoldings, mockCashBalance, STARTING_CAPITAL } from '$lib/mock/portfolio';
import { marketStore } from './market.svelte';
import type { HoldingWithMarket, PortfolioSummary } from '$lib/types';

class PortfolioStore {
	holdings: HoldingWithMarket[] = $derived(
		mockHoldings.map((h) => {
			const stock = marketStore.stocks.find((s) => s.ticker === h.ticker)!;
			const currentValue = h.shares * stock.currentPrice;
			const totalCost = h.shares * h.avgCost;
			const pnl = currentValue - totalCost;
			return {
				...h,
				stock,
				currentValue,
				totalCost,
				pnl,
				pnlPercent: (pnl / totalCost) * 100,
			};
		})
	);

	summary: PortfolioSummary = $derived(
		(() => {
			const holdingsValue = this.holdings.reduce((sum, h) => sum + h.currentValue, 0);
			const totalValue = holdingsValue + mockCashBalance;
			const totalPnl = totalValue - STARTING_CAPITAL;
			const dayChange = this.holdings.reduce(
				(sum, h) => sum + h.stock.dayChange * h.shares,
				0
			);
			const prevHoldingsValue = this.holdings.reduce(
				(sum, h) => sum + h.stock.previousClose * h.shares,
				0
			);
			const prevTotal = prevHoldingsValue + mockCashBalance;
			return {
				totalValue,
				holdingsValue,
				cashBalance: mockCashBalance,
				totalPnl,
				totalPnlPercent: (totalPnl / STARTING_CAPITAL) * 100,
				dayChange,
				dayChangePercent: prevTotal > 0 ? (dayChange / prevTotal) * 100 : 0,
			};
		})()
	);
}

export const portfolioStore = new PortfolioStore();
