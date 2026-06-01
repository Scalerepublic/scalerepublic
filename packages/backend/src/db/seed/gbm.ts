import type { PRNG } from 'seedrandom';

export type PricePoint = { recordedAt: Date; price: number };

const DT = 1 / (24 * 365); // 1 hour expressed in years

const stdNormal = (rng: PRNG): number => {
  const u1 = Math.max(Number.EPSILON, rng());
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
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
