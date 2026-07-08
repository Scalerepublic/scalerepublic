import { ApiError } from '$lib/api';
import { API_CACHE_TTL_MS, getApiCache, setApiCache } from '$lib/api-cache';
import { api, parseApiData } from '$lib/api/client';
import type { BackendPortfolioPayload } from '$lib/api/backend-types';
import { mapPortfolioPayload } from '$lib/api/mappers';
import { authStore } from '$lib/stores/auth.svelte';
import { marketStore } from '$lib/stores/market.svelte';
import type {
	ApiAutoTradeRule,
	ApiPortfolio,
	HoldingWithMarket,
	PortfolioSummary
} from '$lib/types';

class PortfolioStore {
	private _data = $state<ApiPortfolio | null>(null);
	private _limitOrders = $state<ApiAutoTradeRule[]>([]);
	loading = $state(false);
	error = $state<string | null>(null);
	private trackedPortfolioId: string | null = null;
	private loadInFlight: Promise<void> | null = null;

	async load(options?: { silent?: boolean; force?: boolean }) {
		if (this.loadInFlight) {
			return this.loadInFlight;
		}

		this.loadInFlight = this.fetchPortfolio(options).finally(() => {
			this.loadInFlight = null;
		});
		return this.loadInFlight;
	}

	private portfolioCacheKey(userId: string): string {
		return `v1/users/${userId}/portfolio`;
	}

	private async fetchPortfolio(options?: { silent?: boolean; force?: boolean }) {
		const silent = options?.silent ?? false;
		const force = options?.force ?? false;
		const userId = authStore.user?.id;
		if (!userId) {
			this._data = null;
			this.trackedPortfolioId = null;
			return;
		}

		const cacheKey = this.portfolioCacheKey(userId);
		if (!force) {
			const cached = getApiCache<ApiPortfolio>(cacheKey, API_CACHE_TTL_MS.portfolio);
			if (cached !== null) {
				this._data = cached;
				this.trackedPortfolioId = cached.portfolioId;
				this.error = null;
				return;
			}
		}

		if (!silent) {
			this.loading = true;
		}
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
			setApiCache(cacheKey, mapped);
			this._data = mapped;
		} catch (e) {
			this.error = e instanceof Error ? e.message : 'Failed to load portfolio';
			this._data = null;
			this.trackedPortfolioId = null;
			if (e instanceof ApiError && e.status === 401) {
				return;
			}
		} finally {
			if (!silent) {
				this.loading = false;
			}
		}
	}

	async forceDefault(): Promise<{
		penaltyCounter: number;
		isSuspended: boolean;
		activePortfolioId: string | null;
	}> {
		const res = await api.api.v1.portfolio.default.$post();
		const data = await parseApiData<{
			penaltyCounter: number;
			isSuspended: boolean;
			activePortfolioId: string | null;
		}>(res);
		await this.load({ force: true });
		return data;
	}

	async buy(stockId: string, quantity: number) {
		if (!this._data?.portfolioId) {
			await this.load();
		}
		const portfolioId = this._data?.portfolioId;
		if (!portfolioId) throw new Error(this.error ?? 'Portfolio not loaded');

		const stock = marketStore.findStock(stockId);
		const price = stock?.currentPrice;
		if (!price || price <= 0) throw new Error('Price unavailable');

		const res = await api.api.v1.portfolio.buy.$post({
			json: { portfolioId, stockId, quantity, price }
		});
		await parseApiData(res);
		await this.load({ force: true });
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
		await this.load({ force: true });
	}

	async createLimitOrder(params: {
		stockId: string;
		ruleType: 'BUY' | 'SELL';
		triggerDirection: 'AT_OR_ABOVE' | 'AT_OR_BELOW';
		priceThreshold: number;
		quantity: number;
	}) {
		if (!this._data?.portfolioId) {
			await this.load();
		}
		const portfolioId = this._data?.portfolioId;
		if (!portfolioId) throw new Error(this.error ?? 'Portfolio not loaded');

		const res = await api.api.v1.autotrade.$post({
			json: { portfolioId, ...params }
		});
		await parseApiData(res);
		await this.loadLimitOrders();
	}

	limitOrdersError = $state<string | null>(null);

	get limitOrders(): ApiAutoTradeRule[] {
		return this._limitOrders;
	}

	async loadLimitOrders() {
		if (!this._data?.portfolioId) {
			await this.load();
		}
		const portfolioId = this._data?.portfolioId;
		if (!portfolioId) return;

		try {
			const res = await api.api.v1.portfolio[':portfolioId'].autotrades.$get({
				param: { portfolioId }
			});
			this._limitOrders = await parseApiData<ApiAutoTradeRule[]>(res);
			this.limitOrdersError = null;
		} catch (e) {
			this.limitOrdersError = e instanceof Error ? e.message : 'Could not load limit orders';
		}
	}

	async cancelLimitOrder(ruleId: string) {
		const res = await api.api.v1.autotrade[':ruleId'].cancel.$post({ param: { ruleId } });
		await parseApiData(res);
		await this.loadLimitOrders();
	}

	private resolvePrice(stockId: string, fallback: number | null): number {
		if (fallback !== null && fallback > 0) {
			return fallback;
		}
		const fromMarket = marketStore.findStock(stockId);
		return fromMarket?.currentPrice ?? 0;
	}

	get portfolioStatus(): ApiPortfolio['status'] | null {
		return this._data?.status ?? null;
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
