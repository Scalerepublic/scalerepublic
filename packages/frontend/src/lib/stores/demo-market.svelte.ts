/**
 * Purpose: Manage simulated-market state and invalidate affected query caches after clock changes.
 */
import { ApiError } from '$lib/api';
import { queryClient } from '$lib/api/query-client';
import { setDemoMarketDate } from '$lib/demo-market-date';
import { isMarketDebugOperator } from '$lib/market-debug-operator';
import { syncMarketClock } from '$lib/sync-market-clock';
import { authStore } from '$lib/stores/auth.svelte';

type MarketDebugStatus = {
	marketDate: string;
	dayOffset: number;
};

type MarketDebugActionResult = MarketDebugStatus & {
	updated?: number;
	percentage?: number;
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

	private async post(path: string, body?: Record<string, unknown>) {
		this.loading = true;
		this.error = null;
		try {
			const res = await fetch(path, {
				method: 'POST',
				credentials: 'include',
				headers: body ? { 'Content-Type': 'application/json' } : undefined,
				body: body ? JSON.stringify(body) : undefined
			});
			const json = (await res.json()) as { data?: MarketDebugActionResult; error?: string };
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
	}

	async applyGbmTick() {
		await this.post('/api/v1/debug/market/tick');
	}

	async applyMarketCrash(percentage: number) {
		await this.post('/api/v1/debug/market/crash', { percentage });
	}

	private async reloadAppData() {
		await syncMarketClock({ force: true });
		await queryClient.invalidateQueries();
	}
}

export const demoMarketStore = new DemoMarketStore();
