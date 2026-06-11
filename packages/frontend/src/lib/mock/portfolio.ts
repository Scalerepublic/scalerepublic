import type { Holding } from '$lib/types';

export const STARTING_CAPITAL = 10_000;

export const mockCashBalance = 2843.17;

export const mockHoldings: Holding[] = [
	{ ticker: 'AAPL', shares: 8, avgCost: 198.5 },
	{ ticker: 'NVDA', shares: 15, avgCost: 122.4 },
	{ ticker: 'TSLA', shares: 5, avgCost: 215.0 },
	{ ticker: 'MSFT', shares: 3, avgCost: 430.2 },
	{ ticker: 'PLTR', shares: 20, avgCost: 95.6 }
];
