import type { Holding } from '$lib/types';

export const STARTING_CAPITAL = 10_000;

export const mockCashBalance = 2843.17;

export const mockHoldings: Holding[] = [
	{ ticker: 'AAPL', shares: 8,  avgCost: 198.50 },
	{ ticker: 'NVDA', shares: 15, avgCost: 122.40 },
	{ ticker: 'TSLA', shares: 5,  avgCost: 215.00 },
	{ ticker: 'MSFT', shares: 3,  avgCost: 430.20 },
	{ ticker: 'PLTR', shares: 20, avgCost: 95.60  },
];
