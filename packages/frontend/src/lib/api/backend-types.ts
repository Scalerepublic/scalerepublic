import type { ApiClient } from 'backend/api-client';
import type { InferResponseType } from 'hono/client';

type Endpoints = ApiClient['api']['v1'];

type Data<T> =
	Extract<InferResponseType<T>, { data: unknown }> extends { data: infer D } ? D : never;

export type BackendStockSummary = Data<Endpoints['stocks']['trending']['$get']>[number];
export type BackendStockListResponse = Data<Endpoints['stocks']['$get']>;
export type BackendMarketSectorCatalog = Data<Endpoints['stocks']['sectors']['$get']>;
export type BackendMarketSector = BackendMarketSectorCatalog['sectors'][number];
export type BackendStockDetail = Data<Endpoints['stocks'][':ticker']['detail']['$get']>;

export type BackendPortfolioPayload = Data<Endpoints['users'][':id']['portfolio']['$get']>;
export type BackendPortfolioRow = BackendPortfolioPayload['portfolio'];
export type BackendPortfolioPosition = BackendPortfolioPayload['holdings'][number];

export type BackendAutoTradeRule = Data<
	Endpoints['portfolio'][':portfolioId']['autotrades']['$get']
>[number];

export type BackendLeaderboardEntry = Data<Endpoints['leaderboard']['$get']>[number];

export type BackendUserProfile = Data<Endpoints['users'][':id']['$get']>;
export type BackendUserSearchResult = Data<Endpoints['users']['search']['$get']>[number];
export type BackendPerformancePoint = Data<
	Endpoints['users'][':id']['performance']['$get']
>[number];

export type BackendNotification = Data<Endpoints['notifications']['$get']>[number];
export type BackendNotificationType = BackendNotification['type'];
