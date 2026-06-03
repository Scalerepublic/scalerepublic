import { ApiError } from '$lib/api';
import { setDemoMarketDate } from '$lib/demo-market-date';
import { isMarketDebugOperator } from '$lib/market-debug-operator';
import { syncMarketClock } from '$lib/sync-market-clock';
import { authStore } from '$lib/stores/auth.svelte';
import { marketStore } from '$lib/stores/market.svelte';
import { portfolioStore } from '$lib/stores/portfolio.svelte';

type MarketDebugStatus = {
	marketDate: string;
	dayOffset: number;
};

class DemoMarketStore {
	marketDate = $state<string | null>(null);
	dayOffset = $state(0);
	canOperate = $state(false);
	loading = $state(false);
	error = $state<string | null>(null);

	get enabled(): boolean {
		return this.canOperate;
	}

	async refreshStatus() {
		await syncMarketClock();

		if (!isMarketDebugOperator(authStore.user?.email)) {
			this.canOperate = false;
			return;
		}

		try {
			const res = await fetch('/api/v1/debug/market', { credentials: 'include' });
			if (res.status === 404) {
				this.canOperate = false;
				return;
			}
			const json = (await res.json()) as { data?: MarketDebugStatus; error?: string };
			if (!res.ok) {
				if (res.status === 403) {
					this.canOperate = false;
					return;
				}
				throw new ApiError(json.error ?? res.statusText, res.status);
			}
			if (!json.data) {
				throw new ApiError('Missing debug status', res.status);
			}
			this.canOperate = true;
			this.marketDate = json.data.marketDate;
			this.dayOffset = json.data.dayOffset;
			setDemoMarketDate(json.data.marketDate);
			this.error = null;
		} catch (e) {
			if (e instanceof ApiError && (e.status === 404 || e.status === 403)) {
				this.canOperate = false;
				return;
			}
			this.error = e instanceof Error ? e.message : 'Debug API unavailable';
		}
	}

	get marketDateIso(): string {
		return this.marketDate ?? new Date().toISOString().slice(0, 10);
	}

	private async post(path: string) {
		this.loading = true;
		this.error = null;
		try {
			const res = await fetch(path, { method: 'POST', credentials: 'include' });
			const json = (await res.json()) as { data?: MarketDebugStatus; error?: string };
			if (!res.ok) {
				throw new ApiError(json.error ?? res.statusText, res.status);
			}
			if (json.data?.marketDate) {
				this.marketDate = json.data.marketDate;
				setDemoMarketDate(json.data.marketDate);
			}
			if (typeof json.data?.dayOffset === 'number') {
				this.dayOffset = json.data.dayOffset;
			}
			await this.reloadAppData();
		} catch (e) {
			this.error = e instanceof Error ? e.message : 'Debug action failed';
		} finally {
			this.loading = false;
		}
	}

	async advanceDay() {
		await this.post('/api/v1/debug/market/advance');
	}

	async retreatDay() {
		await this.post('/api/v1/debug/market/retreat');
		portfolioStore.trimPerformanceHistoryTo(this.marketDateIso);
	}

	async applyGbmTick() {
		await this.post('/api/v1/debug/market/tick');
	}

	private async reloadAppData() {
		await Promise.all([
			syncMarketClock(),
			marketStore.load({ silent: true }),
			portfolioStore.load()
		]);
	}
}

export const demoMarketStore = new DemoMarketStore();
