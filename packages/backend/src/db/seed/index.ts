import { inArray } from 'drizzle-orm';
import seedrandom from 'seedrandom';

import { client, db } from '../index.ts';
import { stockPrice } from '../schema/stock/market.ts';
import { stock } from '../schema/stock/stock.ts';

import { generateGBM } from './gbm.ts';
import { ARCHETYPES, SEED_STOCKS } from './stocks.ts';

const GLOBAL_SEED = process.env.SEED_RNG_SEED ?? '42';
const MONTHS = parseInt(process.env.SEED_MONTHS ?? '2', 10);
const HOURS = Math.round(MONTHS * 30.44 * 24);
const BATCH_SIZE = 500;

const startDate = new Date();
startDate.setMonth(startDate.getMonth() - MONTHS);
startDate.setMinutes(0, 0, 0);

console.log(`Seeding ${SEED_STOCKS.length} stocks × ${HOURS} hours (${MONTHS} months) from ${startDate.toISOString()}`);

await db
  .insert(stock)
  .values(
    SEED_STOCKS.map(s => ({
      id: crypto.randomUUID(),
      ticker: s.ticker,
      companyName: s.companyName,
      exchange: s.exchange,
      currency: 'USD',
      isActive: true,
    }))
  )
  .onConflictDoNothing({ target: stock.ticker });

const stockRows = await db
  .select({ id: stock.id, ticker: stock.ticker })
  .from(stock)
  .where(inArray(stock.ticker, SEED_STOCKS.map(s => s.ticker)));

const tickerToId = Object.fromEntries(stockRows.map(r => [r.ticker, r.id]));

for (let i = 0; i < SEED_STOCKS.length; i++) {
  const def = SEED_STOCKS[i]!;
  const stockId = tickerToId[def.ticker];
  if (stockId === undefined) throw new Error(`Stock ${def.ticker} missing after insert`);

  const { drift, volatility } = ARCHETYPES[def.archetype];
  const rng = seedrandom(`${GLOBAL_SEED}:${i}`);

  const points = generateGBM({ initialPrice: def.initialPrice, drift, volatility, hours: HOURS, startDate, rng });

  const rows = points.map(p => ({
    id: crypto.randomUUID(),
    stockId,
    price: p.price.toFixed(4),
    source: 'seed',
    recordedAt: p.recordedAt,
  }));

  for (let j = 0; j < rows.length; j += BATCH_SIZE) {
    await db.insert(stockPrice).values(rows.slice(j, j + BATCH_SIZE)).onConflictDoNothing();
  }

  console.log(`[+] ${def.ticker} (${def.archetype}): ${points.length} points`);
}

await client.end();
console.log('Done.');
