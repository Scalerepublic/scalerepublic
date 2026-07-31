/**
 * Purpose: Wire the request-scoped database, authentication, market-data client, and domain services used by every backend feature.
 */
import type { Context, Hono } from 'hono'

import { db as defaultDb, type DbConnection } from './db/index.ts'
import { type Auth, type AuthOptions, createAuth } from './lib/auth.ts'
import { isMarketDebugEnabled } from './lib/market-debug.ts'
import { AutoTradeService } from './modules/autotrade/index.ts'
import { LeaderboardService } from './modules/leaderboard/leaderboard.service.ts'
import { MarketDebugService } from './modules/market-debug/market-debug.service.ts'
import { NotificationService } from './modules/notification/index.ts'
import { PortfolioDefaultService } from './modules/portfolio/portfolio-default.service.ts'
import { PortfolioPerformanceService } from './modules/portfolio/portfolio-performance.service.ts'
import { PortfolioService } from './modules/portfolio/portfolio.services.ts'
import { StockService } from './modules/stock/stock.service.ts'
import { MockStockDataClient } from './modules/stockapi/mock-stock-client.ts'
import type { StockDataClient } from './modules/stockapi/stock-data-client.ts'
import { UniStockClient, type UniApiSubfetch } from './modules/stockapi/uni-stock-client.ts'
import { AlphaVantageStockClient } from './modules/stockapi/vantage/vantage-stock-client.ts'
import { SyncService } from './modules/sync/sync.service.ts'
import { TradesService } from './modules/trades/index.ts'
import { UserService } from './modules/user/user.service.ts'

export type AppVars = {
    db: DbConnection
    auth: Auth
    stockDataClient: StockDataClient
    stockService: StockService
    marketDebugService: MarketDebugService
    userService: UserService
    leaderboardService: LeaderboardService
    syncService: SyncService
    portfolioService: PortfolioService
    portfolioDefaultService: PortfolioDefaultService
    portfolioPerformanceService: PortfolioPerformanceService
    tradesService: TradesService
    autoTradeService: AutoTradeService
    notificationService: NotificationService
}

export type AppEnv = {
    Variables: {
        ctx: AppVars
    }
}

export type App = Hono<AppEnv>
export type AppContext = Context<AppEnv>

export const useCtx = (c: AppContext): AppVars => c.get('ctx')

export type AppContextOptions = {
    auth?: AuthOptions
    uniApiSubfetch?: UniApiSubfetch
    uniApiBaseUrl?: string
}

export const createAppContext = (
    db: DbConnection = defaultDb,
    options: AppContextOptions = {},
): AppVars => {
    // Services share one context and call one another, so the container is populated in two
    // phases: establish the database first, then attach every adapter/service to that object.
    const ctx = { db } as AppVars
    ctx.auth = createAuth(db, options.auth)
    if (process.env.NODE_ENV === 'test' || isMarketDebugEnabled()) {
        ctx.stockDataClient = new MockStockDataClient()
    } else if (process.env['STOCK_API_PROVIDER'] === 'uni') {
        ctx.stockDataClient = new UniStockClient(
            undefined,
            options.uniApiBaseUrl,
            options.uniApiSubfetch,
        )
    } else {
        ctx.stockDataClient = new AlphaVantageStockClient()
    }
    ctx.marketDebugService = new MarketDebugService(ctx)
    ctx.stockService = new StockService(ctx)
    ctx.userService = new UserService(ctx)
    ctx.leaderboardService = new LeaderboardService(ctx)
    ctx.syncService = new SyncService(ctx)
    ctx.portfolioService = new PortfolioService(ctx)
    ctx.portfolioDefaultService = new PortfolioDefaultService(ctx)
    ctx.portfolioPerformanceService = new PortfolioPerformanceService(ctx)
    ctx.tradesService = new TradesService(ctx)
    ctx.notificationService = new NotificationService(ctx)
    ctx.autoTradeService = new AutoTradeService(ctx)
    return ctx
}
