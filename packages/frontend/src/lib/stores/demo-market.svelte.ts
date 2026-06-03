import { ApiError } from '$lib/api';
import { setDemoMarketDate } from '$lib/demo-market-date';
import { marketStore } from '$lib/stores/market.svelte';
import { portfolioStore } from '$lib/stores/portfolio.svelte';

type MarketDebugStatus = {
	marketDate: string;
	dayOffset: number;
};

class DemoMarketStore {
	marketDate = $state<string | null>(null);
	dayOffset = $state(0);
	enabled = $state(false);
	loading = $state(false);
	error = $state<string | null>(null);

	async refreshStatus() {
		try {
			const res = await fetch('/api/v1/debug/market');
			if (res.status === 404) {
				this.enabled = false;
				setDemoMarketDate(null);
				return;
			}
			const json = (await res.json()) as { data?: MarketDebugStatus; error?: string };
			if (!res.ok) {
				throw new ApiError(json.error ?? res.statusText, res.status);
			}
			if (!json.data) {
				throw new ApiError('Missing debug status', res.status);
			}
			this.enabled = true;
			this.marketDate = json.data.marketDate;
			this.dayOffset = json.data.dayOffset;
			setDemoMarketDate(json.data.marketDate);
			this.error = null;
		} catch (e) {
			if (e instanceof ApiError && e.status === 404) {
				this.enabled = false;
				setDemoMarketDate(null);
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
			const res = await fetch(path, { method: 'POST' });
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
		await Promise.all([marketStore.load({ silent: true }), portfolioStore.load()]);
	}
}

export const demoMarketStore = new DemoMarketStore();
