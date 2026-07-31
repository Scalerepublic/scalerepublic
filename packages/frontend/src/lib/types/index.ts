import type { BackendAutoTradeRule } from '$lib/api/backend-types';

export interface Stock {
	id: string;
	ticker: string;
	name: string;
	sector: string;
	exchange?: string;
	currentPrice: number;
	previousClose: number;
	dayChange: number;
	dayChangePercent: number;
	periodChangePercent?: number | null;
	marketCap?: number;
	volume?: number;
}

export interface Holding {
	ticker: string;
	shares: number;
	avgCost: number;
}

export interface HoldingWithMarket extends Holding {
	stock: Stock;
	currentValue: number;
	totalCost: number;
	pnl: number;
	pnlPercent: number;
}

export interface PortfolioSummary {
	totalValue: number;
	holdingsValue: number;
	cashBalance: number;
	totalPnl: number;
	totalPnlPercent: number;
	dayChange: number;
	dayChangePercent: number;
}

export interface UserProfile {
	id: string;
	name: string;
	email: string;
	/** Populated once backend exposes portfolio endpoint. */
	startingCapital?: number;
	/** Populated once backend exposes portfolio endpoint. */
	accountStatus?: 'active' | 'suspended';
	joinedAt: string;
	avatarUrl: string | null;
	rank?: number;
	penaltyCounter?: number;
}

export type { ApiHolding, ApiLeaderboardEntry, ApiPortfolio } from '$lib/api/mappers';

export type ApiAutoTradeRule = BackendAutoTradeRule;
export type AutoTradeRuleType = ApiAutoTradeRule['ruleType'];
export type AutoTradeTriggerDirection = ApiAutoTradeRule['triggerDirection'];
export type AutoTradeStatus = ApiAutoTradeRule['status'];
