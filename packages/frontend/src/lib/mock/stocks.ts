import type { Stock } from '$lib/types';

export const mockStocks: Stock[] = [
	{
		ticker: 'AAPL',
		name: 'Apple Inc.',
		sector: 'Technology',
		currentPrice: 213.49,
		previousClose: 210.31,
		dayChange: 3.18,
		dayChangePercent: 1.51,
		marketCap: 3_280_000_000_000,
		volume: 62_400_000
	},
	{
		ticker: 'MSFT',
		name: 'Microsoft Corporation',
		sector: 'Technology',
		currentPrice: 447.23,
		previousClose: 440.11,
		dayChange: 7.12,
		dayChangePercent: 1.62,
		marketCap: 3_320_000_000_000,
		volume: 18_200_000
	},
	{
		ticker: 'NVDA',
		name: 'NVIDIA Corporation',
		sector: 'Technology',
		currentPrice: 131.38,
		previousClose: 138.85,
		dayChange: -7.47,
		dayChangePercent: -5.38,
		marketCap: 3_220_000_000_000,
		volume: 290_000_000
	},
	{
		ticker: 'TSLA',
		name: 'Tesla, Inc.',
		sector: 'Automotive',
		currentPrice: 248.5,
		previousClose: 238.8,
		dayChange: 9.7,
		dayChangePercent: 4.06,
		marketCap: 792_000_000_000,
		volume: 98_000_000
	},
	{
		ticker: 'AMZN',
		name: 'Amazon.com, Inc.',
		sector: 'Consumer',
		currentPrice: 224.8,
		previousClose: 220.15,
		dayChange: 4.65,
		dayChangePercent: 2.11,
		marketCap: 2_360_000_000_000,
		volume: 44_000_000
	},
	{
		ticker: 'GOOGL',
		name: 'Alphabet Inc.',
		sector: 'Technology',
		currentPrice: 178.1,
		previousClose: 175.9,
		dayChange: 2.2,
		dayChangePercent: 1.25,
		marketCap: 2_180_000_000_000,
		volume: 22_000_000
	},
	{
		ticker: 'META',
		name: 'Meta Platforms, Inc.',
		sector: 'Technology',
		currentPrice: 604.15,
		previousClose: 597.4,
		dayChange: 6.75,
		dayChangePercent: 1.13,
		marketCap: 1_520_000_000_000,
		volume: 13_000_000
	},
	{
		ticker: 'GME',
		name: 'GameStop Corp.',
		sector: 'Retail',
		currentPrice: 24.63,
		previousClose: 28.1,
		dayChange: -3.47,
		dayChangePercent: -12.35,
		marketCap: 10_800_000_000,
		volume: 8_400_000
	},
	{
		ticker: 'AMC',
		name: 'AMC Entertainment',
		sector: 'Entertainment',
		currentPrice: 3.21,
		previousClose: 3.05,
		dayChange: 0.16,
		dayChangePercent: 5.25,
		marketCap: 1_400_000_000,
		volume: 24_000_000
	},
	{
		ticker: 'PLTR',
		name: 'Palantir Technologies',
		sector: 'Technology',
		currentPrice: 118.4,
		previousClose: 112.8,
		dayChange: 5.6,
		dayChangePercent: 4.96,
		marketCap: 262_000_000_000,
		volume: 64_000_000
	},
	{
		ticker: 'COIN',
		name: 'Coinbase Global, Inc.',
		sector: 'Finance',
		currentPrice: 248.7,
		previousClose: 255.3,
		dayChange: -6.6,
		dayChangePercent: -2.59,
		marketCap: 62_000_000_000,
		volume: 9_200_000
	},
	{
		ticker: 'NFLX',
		name: 'Netflix, Inc.',
		sector: 'Media',
		currentPrice: 1145.2,
		previousClose: 1118.45,
		dayChange: 26.75,
		dayChangePercent: 2.39,
		marketCap: 490_000_000_000,
		volume: 4_100_000
	},
	{
		ticker: 'DIS',
		name: 'The Walt Disney Company',
		sector: 'Entertainment',
		currentPrice: 97.3,
		previousClose: 99.1,
		dayChange: -1.8,
		dayChangePercent: -1.82,
		marketCap: 176_000_000_000,
		volume: 11_000_000
	},
	{
		ticker: 'JPM',
		name: 'JPMorgan Chase & Co.',
		sector: 'Finance',
		currentPrice: 254.8,
		previousClose: 251.3,
		dayChange: 3.5,
		dayChangePercent: 1.39,
		marketCap: 730_000_000_000,
		volume: 8_800_000
	},
	{
		ticker: 'BRK.B',
		name: 'Berkshire Hathaway B',
		sector: 'Finance',
		currentPrice: 529.1,
		previousClose: 525.6,
		dayChange: 3.5,
		dayChangePercent: 0.67,
		marketCap: 1_140_000_000_000,
		volume: 3_200_000
	}
];
