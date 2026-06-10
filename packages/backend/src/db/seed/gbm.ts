import type { PRNG } from 'seedrandom';

export type PricePoint = { recordedAt: Date; price: number };

const DT = 1 / (24 * 365);
export const DT_DAILY = 1 / 365;

const stdNormal = (rng: PRNG): number => {
  const u1 = Math.max(Number.EPSILON, rng());
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
};

export const stepGbm = (
  price: number,
  drift: number,
  volatility: number,
  rng: () => number,
  dt = DT_DAILY,
): number => {
  const z = stdNormal(rng);
  const next =
    price *
    Math.exp((drift - 0.5 * volatility ** 2) * dt + volatility * Math.sqrt(dt) * z);
  return Math.max(0.01, next);
};

export const generateGBM = (params: {
  initialPrice: number;
  drift: number;
  volatility: number;
  hours: number;
  startDate: Date;
  rng: PRNG;
}): PricePoint[] => {
  const { initialPrice, drift, volatility, hours, startDate, rng } = params;
  const points: PricePoint[] = [];
  let price = initialPrice;

  for (let i = 0; i < hours; i++) {
    points.push({
      recordedAt: new Date(startDate.getTime() + i * 60 * 60 * 1000),
      price: Math.max(0.01, price),
    });
    const z = stdNormal(rng);
    price *= Math.exp((drift - 0.5 * volatility ** 2) * DT + volatility * Math.sqrt(DT) * z);
  }

  return points;
};
