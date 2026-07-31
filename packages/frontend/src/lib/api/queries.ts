/**
 * Purpose: Centralize query keys, fetch functions, polling rules, and cache behavior for every API resource.
 */
import { keepPreviousData, queryOptions } from '@tanstack/svelte-query';

import { api, parseApiData } from '$lib/api/client';
import { mapLeaderboardEntry, mapPortfolioPayload, mapStockSummary } from '$lib/api/mappers';
import { queryClient } from '$lib/api/query-client';
import type { PerformanceGranularity } from '$lib/performance-history';

const MINUTE = 60_000;
const LIVE_MS = 10_000;

export type StocksListParams = {
	q?: string;
	sector?: string;
	page: number;
	limit: number;
};

export const cacheKeys = {
	stocks: {
		all: ['stocks'] as const,
		trending: ['stocks', 'trending'] as const,
		sectors: ['stocks', 'sectors'] as const,
		list: (params: StocksListParams) => ['stocks', 'list', params] as const,
		detail: (ticker: string) => ['stocks', 'detail', ticker] as const
	},
	leaderboard: ['leaderboard'] as const,
	notifications: ['notifications'] as const,
	portfolio: {
		all: ['portfolio'] as const,
		byUser: (userId: string | undefined) => ['portfolio', userId] as const
	},
	autotrades: {
		all: ['autotrades'] as const,
		byPortfolio: (portfolioId: string | undefined) => ['autotrades', portfolioId] as const
	},
	performance: {
		all: ['performance'] as const,
		byUser: (userId: string | undefined, granularity: PerformanceGranularity) =>
			['performance', userId, granularity] as const
	},
	user: {
		all: ['user'] as const,
		profile: (userId: string | undefined) => ['user', 'profile', userId] as const,
		search: (q: string) => ['user', 'search', q] as const
	},
	trader: {
		all: ['trader'] as const,
		profile: (id: string) => ['trader', id, 'profile'] as const,
		portfolio: (id: string) => ['trader', id, 'portfolio'] as const,
		performance: (id: string, granularity: PerformanceGranularity) =>
			['trader', id, 'performance', granularity] as const
	}
};

// This file is the only polling/cache-policy layer. Route components consume the small reactive
// wrappers in lib/data, which keeps HTTP details and invalidation rules out of the UI.

export const stocksTrendingQuery = () =>
	queryOptions({
		queryKey: cacheKeys.stocks.trending,
		staleTime: LIVE_MS,
		refetchInterval: LIVE_MS,
		queryFn: async () => {
			const rows = await parseApiData(
				await api.api.v1.stocks.trending.$get({ query: { limit: '6' } })
			);
			return rows.map(mapStockSummary);
		}
	});

export const stocksSectorsQuery = () =>
	queryOptions({
		queryKey: cacheKeys.stocks.sectors,
		staleTime: 10 * MINUTE,
		queryFn: async () => parseApiData(await api.api.v1.stocks.sectors.$get())
	});

export const stocksListQuery = (params: StocksListParams) =>
	queryOptions({
		queryKey: cacheKeys.stocks.list(params),
		staleTime: LIVE_MS,
		refetchInterval: LIVE_MS,
		placeholderData: keepPreviousData,
		queryFn: async () => {
			const q = params.q?.trim();
			const sector = params.sector?.trim();
			const payload = await parseApiData(
				await api.api.v1.stocks.$get({
					query: {
						page: String(params.page),
						limit: String(params.limit),
						...(q ? { q } : {}),
						...(sector ? { sector } : {})
					}
				})
			);
			return { ...payload, items: payload.items.map(mapStockSummary) };
		}
	});

export const stockDetailQuery = (ticker: string) =>
	queryOptions({
		queryKey: cacheKeys.stocks.detail(ticker),
		staleTime: LIVE_MS,
		refetchInterval: LIVE_MS,
		queryFn: async () =>
			parseApiData(
				await api.api.v1.stocks[':ticker'].detail.$get({
					param: { ticker },
					query: { historyDays: '365' }
				})
			)
	});

export const leaderboardQuery = () =>
	queryOptions({
		queryKey: cacheKeys.leaderboard,
		staleTime: LIVE_MS,
		refetchInterval: LIVE_MS,
		queryFn: async () => {
			const rows = await parseApiData(
				await api.api.v1.leaderboard.$get({ query: { limit: '50' } })
			);
			return rows.map(mapLeaderboardEntry);
		}
	});

export const notificationsQuery = () =>
	queryOptions({
		queryKey: cacheKeys.notifications,
		staleTime: 15_000,
		refetchInterval: 15_000,
		queryFn: async () =>
			parseApiData(await api.api.v1.notifications.$get({ query: { limit: '50' } }))
	});

export const portfolioQuery = (userId: string | undefined) =>
	queryOptions({
		queryKey: cacheKeys.portfolio.byUser(userId),
		enabled: userId != null,
		staleTime: LIVE_MS,
		refetchInterval: LIVE_MS,
		queryFn: async () =>
			mapPortfolioPayload(
				await parseApiData(await api.api.v1.users[':id'].portfolio.$get({ param: { id: userId! } }))
			)
	});

export const autotradesQuery = (portfolioId: string | undefined) =>
	queryOptions({
		queryKey: cacheKeys.autotrades.byPortfolio(portfolioId),
		enabled: portfolioId != null,
		staleTime: 15_000,
		queryFn: async () =>
			parseApiData(
				await api.api.v1.portfolio[':portfolioId'].autotrades.$get({
					param: { portfolioId: portfolioId! }
				})
			)
	});

export const performanceQuery = (userId: string | undefined, granularity: PerformanceGranularity) =>
	queryOptions({
		queryKey: cacheKeys.performance.byUser(userId, granularity),
		enabled: userId != null,
		staleTime: LIVE_MS,
		refetchInterval: LIVE_MS,
		queryFn: async () =>
			parseApiData(
				await api.api.v1.users[':id'].performance.$get({
					param: { id: userId! },
					query: { granularity }
				})
			)
	});

export const userProfileQuery = (userId: string | undefined) =>
	queryOptions({
		queryKey: cacheKeys.user.profile(userId),
		enabled: userId != null,
		staleTime: MINUTE,
		queryFn: async () =>
			parseApiData(await api.api.v1.users[':id'].$get({ param: { id: userId! } }))
	});

export const userSearchQuery = (q: string) =>
	queryOptions({
		queryKey: cacheKeys.user.search(q),
		enabled: q.trim().length > 0,
		staleTime: 30_000,
		queryFn: async () =>
			parseApiData(await api.api.v1.users.search.$get({ query: { q, limit: '10' } }))
	});

export const traderProfileQuery = (id: string) =>
	queryOptions({
		queryKey: cacheKeys.trader.profile(id),
		staleTime: 30_000,
		queryFn: async () => parseApiData(await api.api.v1.users[':id'].$get({ param: { id } }))
	});

export const traderPortfolioQuery = (id: string) =>
	queryOptions({
		queryKey: cacheKeys.trader.portfolio(id),
		staleTime: LIVE_MS,
		refetchInterval: LIVE_MS,
		queryFn: async () =>
			mapPortfolioPayload(
				await parseApiData(await api.api.v1.users[':id'].portfolio.$get({ param: { id } }))
			)
	});

export const traderPerformanceQuery = (id: string, granularity: PerformanceGranularity) =>
	queryOptions({
		queryKey: cacheKeys.trader.performance(id, granularity),
		staleTime: LIVE_MS,
		refetchInterval: LIVE_MS,
		queryFn: async () =>
			parseApiData(
				await api.api.v1.users[':id'].performance.$get({
					param: { id },
					query: { granularity }
				})
			)
	});

export const invalidate = {
	portfolio: () => queryClient.invalidateQueries({ queryKey: cacheKeys.portfolio.all }),
	autotrades: () => queryClient.invalidateQueries({ queryKey: cacheKeys.autotrades.all }),
	leaderboard: () => queryClient.invalidateQueries({ queryKey: cacheKeys.leaderboard }),
	performance: () => queryClient.invalidateQueries({ queryKey: cacheKeys.performance.all }),
	trending: () => queryClient.invalidateQueries({ queryKey: cacheKeys.stocks.trending }),
	notifications: () => queryClient.invalidateQueries({ queryKey: cacheKeys.notifications }),
	user: () => queryClient.invalidateQueries({ queryKey: cacheKeys.user.all }),
	trader: () => queryClient.invalidateQueries({ queryKey: cacheKeys.trader.all })
};

export const buy = async (json: {
	portfolioId: string;
	stockId: string;
	quantity: number;
	price: number;
}) => {
	await parseApiData(await api.api.v1.portfolio.buy.$post({ json }));
	await Promise.all([invalidate.portfolio(), invalidate.performance()]);
};

export const sell = async (json: {
	portfolioId: string;
	stockId: string;
	quantity: number;
	price: number;
}) => {
	await parseApiData(await api.api.v1.portfolio.sell.$post({ json }));
	await Promise.all([invalidate.portfolio(), invalidate.performance()]);
};

export const createLimitOrder = async (json: {
	portfolioId: string;
	stockId: string;
	ruleType: 'BUY' | 'SELL';
	triggerDirection: 'AT_OR_ABOVE' | 'AT_OR_BELOW';
	priceThreshold: number;
	quantity: number;
}) => {
	await parseApiData(await api.api.v1.autotrade.$post({ json }));
	await invalidate.autotrades();
};

export const cancelLimitOrder = async (ruleId: string) => {
	await parseApiData(await api.api.v1.autotrade[':ruleId'].cancel.$post({ param: { ruleId } }));
	await invalidate.autotrades();
};

export const forceDefault = async () => {
	const data = await parseApiData(await api.api.v1.portfolio.default.$post());
	await Promise.all([
		invalidate.portfolio(),
		invalidate.leaderboard(),
		invalidate.performance(),
		invalidate.user()
	]);
	return data;
};

export const markNotificationRead = async (id: string) => {
	await parseApiData(await api.api.v1.notifications[':id'].read.$post({ param: { id } }));
};

export const markAllNotificationsRead = async () => {
	await parseApiData(await api.api.v1.notifications['read-all'].$post());
};

export const deleteAccount = async (password: string, userId: string) =>
	parseApiData(
		await api.api.v1.users[':id'].$delete({ param: { id: userId }, json: { password } })
	);

export const checkEmailAvailable = async (email: string): Promise<boolean> => {
	const { available } = await parseApiData(
		await api.api.v1.auth['email-available'].$get({ query: { email } })
	);
	return available;
};
