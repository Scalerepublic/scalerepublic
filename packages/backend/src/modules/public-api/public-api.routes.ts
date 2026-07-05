import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import { useCtx, type App, type AppContext, type AppEnv } from '../../context.ts';
import { requireApiKey } from '../../lib/require-api-key.ts';
import {
  InsufficientFundsError,
  InsufficientHoldingsError,
  NoActivePortfolioError,
  PortfolioDefaultedError,
  PortfolioNotFoundError,
  PriceMismatchError,
  StockPriceUnavailableError,
  UserSuspendedError,
} from '../portfolio/errors.ts';
import { stockDetailQuerySchema, stockListQuerySchema } from '../stock/stock.schema.ts';
import { performanceQuerySchema } from '../user/user.schema.ts';

import { publicTickerParamSchema, publicTradeBodySchema } from './public-api.schema.ts';

const normalizeTicker = (ticker: string): string => ticker.trim().toUpperCase();

const handlePortfolioError = (c: AppContext, err: unknown) => {
  if (err instanceof PortfolioNotFoundError) return c.json({ error: err.message }, 404);
  if (err instanceof PortfolioDefaultedError) return c.json({ error: err.message }, 403);
  if (err instanceof UserSuspendedError) return c.json({ error: err.message }, 403);
  if (err instanceof InsufficientFundsError) return c.json({ error: err.message }, 422);
  if (err instanceof InsufficientHoldingsError) return c.json({ error: err.message }, 422);
  if (err instanceof StockPriceUnavailableError) return c.json({ error: err.message }, 422);
  if (err instanceof PriceMismatchError) return c.json({ error: err.message }, 409);
  if (err instanceof NoActivePortfolioError) return c.json({ error: err.message }, 404);
  throw err;
};

export const publicApiRoutes = new Hono<AppEnv>()
  .get('/api/public/v1/stocks', zValidator('query', stockListQuerySchema), async (c) => {
    const auth = await requireApiKey(c, 'read');
    if (auth instanceof Response) return auth;

    const query = c.req.valid('query');
    const { stockService } = useCtx(c);
    return c.json({ data: await stockService.listStocks(query) });
  })
  .get(
    '/api/public/v1/stocks/:ticker',
    zValidator('param', publicTickerParamSchema),
    zValidator('query', stockDetailQuerySchema),
    async (c) => {
      const auth = await requireApiKey(c, 'read');
      if (auth instanceof Response) return auth;

      const ticker = normalizeTicker(c.req.valid('param').ticker);
      const { historyDays } = c.req.valid('query');
      const { stockService } = useCtx(c);
      const detail = await stockService.getStockDetail(ticker, historyDays);

      if (detail === null) {
        return c.json({ error: 'Stock not found' }, 404);
      }

      return c.json({ data: detail });
    },
  )
  .get('/api/public/v1/portfolio', async (c) => {
    const auth = await requireApiKey(c, 'read');
    if (auth instanceof Response) return auth;

    const { portfolioService, stockService } = useCtx(c);

    try {
      const portfolioRow = await portfolioService.ensureForUser(auth.userId);
      const portfolioId = portfolioRow.id;
      const holdings = await portfolioService.getHoldings(portfolioId);
      const stockIds = holdings.map((holding) => holding.stockId);
      const [latestPrices, tickers] = await Promise.all([
        stockService.getLatestPricesByStockIds(stockIds),
        stockService.getTickersByStockIds(stockIds),
      ]);

      let portfolioValue = 0;
      const enrichedHoldings = holdings.map((holding) => {
        const currentPrice = latestPrices.get(holding.stockId) ?? null;
        if (currentPrice !== null) {
          portfolioValue += holding.quantity * currentPrice;
        }

        return {
          stockId: holding.stockId,
          ticker: tickers.get(holding.stockId) ?? holding.stockId,
          quantity: holding.quantity,
          avgCost: holding.avgCost,
          currentPrice,
          marketValue: currentPrice !== null ? holding.quantity * currentPrice : null,
        };
      });

      return c.json({
        data: {
          portfolio: portfolioRow,
          holdings: enrichedHoldings,
          portfolioValue,
        },
      });
    } catch (err) {
      return handlePortfolioError(c, err);
    }
  })
  .post('/api/public/v1/portfolio/buy', zValidator('json', publicTradeBodySchema), async (c) => {
    const auth = await requireApiKey(c, 'trade');
    if (auth instanceof Response) return auth;

    const { stockId, quantity, price } = c.req.valid('json');
    const { portfolioService } = useCtx(c);

    try {
      const portfolioRow = await portfolioService.ensureForUser(auth.userId);
      const result = await portfolioService.buy(portfolioRow.id, stockId, quantity, price);
      return c.json({ data: result });
    } catch (err) {
      return handlePortfolioError(c, err);
    }
  })
  .post('/api/public/v1/portfolio/sell', zValidator('json', publicTradeBodySchema), async (c) => {
    const auth = await requireApiKey(c, 'trade');
    if (auth instanceof Response) return auth;

    const { stockId, quantity, price } = c.req.valid('json');
    const { portfolioService } = useCtx(c);

    try {
      const portfolioRow = await portfolioService.ensureForUser(auth.userId);
      const result = await portfolioService.sell(portfolioRow.id, stockId, quantity, price);
      return c.json({ data: result });
    } catch (err) {
      return handlePortfolioError(c, err);
    }
  })
  .get(
    '/api/public/v1/portfolio/performance',
    zValidator('query', performanceQuerySchema),
    async (c) => {
      const auth = await requireApiKey(c, 'read');
      if (auth instanceof Response) return auth;

      const { granularity } = c.req.valid('query');
      const { userService } = useCtx(c);
      const data = await userService.getUserPerformance(auth.userId, granularity);
      return c.json({ data });
    },
  );

export const registerPublicApiRoutes = (app: App) => {
  app.route('/', publicApiRoutes);
};
