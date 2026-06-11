import type { Context, Hono } from 'hono'

import { db, type DbConnection } from './db/index.ts'
import { LeaderboardService } from './modules/leaderboard/leaderboard.service.ts'
import { MarketDebugService } from './modules/market-debug/market-debug.service.ts'
import { PortfolioService } from './modules/portfolio/portfolio.services.ts'
import { StockService } from './modules/stock/stock.service.ts'
import { MockStockDataClient } from './modules/stockapi/mock-stock-client.ts'
import type { StockDataClient } from './modules/stockapi/stock-data-client.ts'
import { UniStockClient } from './modules/stockapi/uni-stock-client.ts'
import { AlphaVantageStockClient } from './modules/stockapi/vantage/vantage-stock-client.ts'
import { SyncService } from './modules/sync/sync.service.ts'
import { TradesService } from './modules/trades/index.ts'
import { UserService } from './modules/user/user.service.ts'

export type AppVars = {
    db: DbConnection
    stockDataClient: StockDataClient
    stockService: StockService
    marketDebugService: MarketDebugService
    userService: UserService
    leaderboardService: LeaderboardService
    syncService: SyncService
    portfolioService: PortfolioService
    tradesService: TradesService
}

export type AppEnv = {
    Variables: {
        ctx: AppVars
    }
}

export type App = Hono<AppEnv>
export type AppContext = Context<AppEnv>

export const useCtx = (c: AppContext): AppVars => c.get('ctx')

export const createAppContext = (): AppVars => {
    // Services receive ctx by reference. ctx.xService properties are populated
    // before any method can be called, so cross-service access is always safe.
    const ctx = { db } as AppVars
    if (process.env.NODE_ENV === 'test') {
        ctx.stockDataClient = new MockStockDataClient()
    } else if (process.env['STOCK_API_PROVIDER'] === 'uni') {
        ctx.stockDataClient = new UniStockClient()
    } else {
        ctx.stockDataClient = new AlphaVantageStockClient()
    }
    ctx.marketDebugService = new MarketDebugService(ctx)
    ctx.stockService = new StockService(ctx)
    ctx.userService = new UserService(ctx)
    ctx.leaderboardService = new LeaderboardService(ctx)
    ctx.syncService = new SyncService(ctx)
    ctx.portfolioService = new PortfolioService(ctx)
    ctx.tradesService = new TradesService(ctx)
    return ctx
}
