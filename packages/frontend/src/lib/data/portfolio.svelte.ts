import { createMutation, createQuery } from '@tanstack/svelte-query';

import { portfolioView } from '$lib/data/portfolio-view';
import { autotradesQuery, cancelLimitOrder, portfolioQuery } from '$lib/api/queries';
import { authStore } from '$lib/stores/auth.svelte';

export function getPortfolio() {
	const query = createQuery(() => portfolioQuery(authStore.user?.id));
	const view = $derived(portfolioView(query.data));

	return {
		get portfolioId() {
			return query.data?.portfolioId;
		},
		get cashBalance() {
			return query.data?.cashBalance ?? 0;
		},
		get status() {
			return query.data?.status ?? null;
		},
		get holdings() {
			return view.holdings;
		},
		get summary() {
			return view.summary;
		},
		get isLoading() {
			return query.isLoading;
		}
	};
}

export function getLimitOrders() {
	const portfolio = getPortfolio();
	const query = createQuery(() => autotradesQuery(portfolio.portfolioId));
	const cancelMutation = createMutation(() => ({ mutationFn: cancelLimitOrder }));

	return {
		get orders() {
			return query.data ?? [];
		},
		get cashBalance() {
			return portfolio.cashBalance;
		},
		get holdings() {
			return portfolio.holdings;
		},
		get isError() {
			return query.isError;
		},
		get error() {
			return query.error;
		},
		get isCancelling() {
			return cancelMutation.isPending;
		},
		cancel: (ruleId: string) => cancelMutation.mutateAsync(ruleId)
	};
}
