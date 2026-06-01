export type Archetype = 'steady_growth' | 'explosive_growth' | 'slow_decline' | 'stagnation';

export type StockDef = {
  ticker: string;
  companyName: string;
  exchange: string;
  initialPrice: number;
  archetype: Archetype;
};

export const ARCHETYPES: Record<Archetype, { drift: number; volatility: number }> = {
  steady_growth:    { drift: 0.12,  volatility: 0.20 },
  explosive_growth: { drift: 0.65,  volatility: 0.50 },
  slow_decline:     { drift: -0.15, volatility: 0.22 },
  stagnation:       { drift: 0.02,  volatility: 0.28 },
};

export const SEED_STOCKS: StockDef[] = [
  { ticker: 'AAPL', companyName: 'Apple Inc.',               exchange: 'NASDAQ', initialPrice: 201.00, archetype: 'steady_growth' },
  { ticker: 'MSFT', companyName: 'Microsoft Corporation',    exchange: 'NASDAQ', initialPrice: 432.00, archetype: 'steady_growth' },
  { ticker: 'GOOGL', companyName: 'Alphabet Inc.',           exchange: 'NASDAQ', initialPrice: 186.00, archetype: 'steady_growth' },
  { ticker: 'AMZN', companyName: 'Amazon.com Inc.',          exchange: 'NASDAQ', initialPrice: 223.00, archetype: 'explosive_growth' },
  { ticker: 'NVDA', companyName: 'NVIDIA Corporation',       exchange: 'NASDAQ', initialPrice: 138.00, archetype: 'explosive_growth' },
  { ticker: 'META', companyName: 'Meta Platforms Inc.',      exchange: 'NASDAQ', initialPrice: 598.00, archetype: 'steady_growth' },
  { ticker: 'TSLA', companyName: 'Tesla Inc.',               exchange: 'NASDAQ', initialPrice: 295.00, archetype: 'stagnation' },
  { ticker: 'JPM',  companyName: 'JPMorgan Chase & Co.',     exchange: 'NYSE',   initialPrice: 252.00, archetype: 'steady_growth' },
  { ticker: 'V',    companyName: 'Visa Inc.',                exchange: 'NYSE',   initialPrice: 294.00, archetype: 'steady_growth' },
  { ticker: 'UNH',  companyName: 'UnitedHealth Group Inc.',  exchange: 'NYSE',   initialPrice: 478.00, archetype: 'slow_decline' },
];
