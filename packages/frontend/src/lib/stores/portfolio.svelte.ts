import { ApiError } from '$lib/api';
import { api, parseApiData } from '$lib/api/client';
import type { BackendPortfolioPayload } from '$lib/api/backend-types';
import { mapPortfolioPayload } from '$lib/api/mappers';
import { authStore } from '$lib/stores/auth.svelte';
import { marketStore } from '$lib/stores/market.svelte';
import type { ApiPortfolio, HoldingWithMarket, PortfolioSummary } from '$lib/types';

class PortfolioStore {
	private _data = $state<ApiPortfolio | null>(null);
	loading = $state(false);
	error = $state<string | null>(null);
	private trackedPortfolioId: string | null = null;

	async load() {
		const userId = authStore.user?.id;
		if (!userId) {
			this._data = null;
			this.trackedPortfolioId = null;
			return;
		}

		this.loading = true;
		this.error = null;
		try {
			const res = await api.api.v1.users[':id'].portfolio.$get({
				param: { id: userId }
			});
			const payload = await parseApiData<BackendPortfolioPayload>(res);
			const mapped = mapPortfolioPayload(payload);
			if (mapped.portfolioId !== this.trackedPortfolioId) {
				this.trackedPortfolioId = mapped.portfolioId;
			}
			this._data = mapped;
		} catch (e) {
			this.error = e instanceof Error ? e.message : 'Failed to load portfolio';
			this._data = null;
			this.trackedPortfolioId = null;
			if (e instanceof ApiError && e.status === 401) {
				return;
			}
		} finally {
			this.loading = false;
		}
	}

	async buy(stockId: string, quantity: number) {
		if (!this._data?.portfolioId) {
			await this.load();
		}
		const portfolioId = this._data?.portfolioId;
		if (!portfolioId) throw new Error(this.error ?? 'Portfolio not loaded');

		const stock =
			marketStore.stocks.find((s) => s.id === stockId) ??
			marketStore.stocks.find((s) => s.ticker === stockId);
		const price = stock?.currentPrice;
		if (!price || price <= 0) throw new Error('Price unavailable');

		const res = await api.api.v1.portfolio.buy.$post({
			json: { portfolioId, stockId, quantity, price }
		});
		await parseApiData(res);
		await this.load();
	}

	async sell(stockId: string, quantity: number) {
		if (!this._data?.portfolioId) {
			await this.load();
		}
		const portfolioId = this._data?.portfolioId;
		if (!portfolioId) throw new Error(this.error ?? 'Portfolio not loaded');

		const holding = this._data?.holdings.find((h) => h.stockId === stockId || h.ticker === stockId);
		const price = this.resolvePrice(holding?.stockId ?? stockId, holding?.currentPrice ?? null);
		if (price <= 0) throw new Error('Price unavailable');

		const res = await api.api.v1.portfolio.sell.$post({
			json: { portfolioId, stockId: holding?.stockId ?? stockId, quantity, price }
		});
		await parseApiData(res);
		await this.load();
	}

	private resolvePrice(stockId: string, fallback: number | null): number {
		if (fallback !== null && fallback > 0) {
			return fallback;
		}
		const fromMarket = marketStore.stocks.find((s) => s.id === stockId);
		return fromMarket?.currentPrice ?? 0;
	}

	get holdings(): HoldingWithMarket[] {
		if (!this._data) return [];
		return this._data.holdings.map((h) => {
			const currentPrice = this.resolvePrice(h.stockId, h.currentPrice);
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
					name: h.companyName,
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

	get summary(): PortfolioSummary {
		const holdings = this.holdings;
		const cashBalance = this._data?.cashBalance ?? 0;
		const startingCapital = this._data?.startingCapital ?? 0;
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
}

export const portfolioStore = new PortfolioStore();
