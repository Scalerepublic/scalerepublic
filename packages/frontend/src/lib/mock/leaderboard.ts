export interface LeaderboardEntry {
	rank: number;
	userId: string;
	name: string;
	netWorth: number;
	cashBalance: number;
	holdingsValue: number;
	returnPercent: number;
	penalties: number;
	lastDefaultedAt: string | null;
	isCurrentUser?: boolean;
}

export const mockLeaderboard: LeaderboardEntry[] = [
	{
		rank: 1,
		userId: 'u1',
		name: 'Sophie Müller',
		netWorth: 18_420.55,
		cashBalance: 3_210.0,
		holdingsValue: 15_210.55,
		returnPercent: 84.21,
		penalties: 0,
		lastDefaultedAt: null
	},
	{
		rank: 2,
		userId: 'u2',
		name: 'Lena Fischer',
		netWorth: 15_980.12,
		cashBalance: 1_450.0,
		holdingsValue: 14_530.12,
		returnPercent: 59.8,
		penalties: 0,
		lastDefaultedAt: null
	},
	{
		rank: 3,
		userId: 'u3',
		name: 'Max Bauer',
		netWorth: 13_740.0,
		cashBalance: 2_100.0,
		holdingsValue: 11_640.0,
		returnPercent: 37.4,
		penalties: 0,
		lastDefaultedAt: null
	},
	{
		rank: 4,
		userId: 'dbrandesx',
		name: 'David Brandes',
		netWorth: 12_156.83,
		cashBalance: 2_843.17,
		holdingsValue: 9_313.66,
		returnPercent: 21.57,
		penalties: 0,
		lastDefaultedAt: null,
		isCurrentUser: true
	},
	{
		rank: 5,
		userId: 'u5',
		name: 'Jonas Weber',
		netWorth: 11_320.0,
		cashBalance: 4_800.0,
		holdingsValue: 6_520.0,
		returnPercent: 13.2,
		penalties: 1,
		lastDefaultedAt: '2026-05-12'
	},
	{
		rank: 6,
		userId: 'u6',
		name: 'Anna Schmidt',
		netWorth: 10_540.5,
		cashBalance: 5_200.0,
		holdingsValue: 5_340.5,
		returnPercent: 5.41,
		penalties: 0,
		lastDefaultedAt: null
	},
	{
		rank: 7,
		userId: 'u7',
		name: 'Tim Krause',
		netWorth: 9_870.25,
		cashBalance: 3_100.0,
		holdingsValue: 6_770.25,
		returnPercent: -1.3,
		penalties: 2,
		lastDefaultedAt: '2026-05-17'
	},
	{
		rank: 8,
		userId: 'u8',
		name: 'Julia Hoffmann',
		netWorth: 8_910.0,
		cashBalance: 6_910.0,
		holdingsValue: 2_000.0,
		returnPercent: -10.9,
		penalties: 1,
		lastDefaultedAt: '2026-05-08'
	},
	{
		rank: 9,
		userId: 'u9',
		name: 'Felix Wagner',
		netWorth: 7_430.0,
		cashBalance: 1_230.0,
		holdingsValue: 6_200.0,
		returnPercent: -25.7,
		penalties: 1,
		lastDefaultedAt: '2026-04-29'
	},
	{
		rank: 10,
		userId: 'u10',
		name: 'Clara Neumann',
		netWorth: 5_120.0,
		cashBalance: 2_120.0,
		holdingsValue: 3_000.0,
		returnPercent: -48.8,
		penalties: 3,
		lastDefaultedAt: '2026-05-19'
	}
];
