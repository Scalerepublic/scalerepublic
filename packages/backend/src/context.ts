import type { Context, Hono } from 'hono'

import { db, type DbConnection } from './db/index.ts'
import { LeaderboardService } from './modules/leaderboard/leaderboard.service.ts'
import { StockService } from './modules/stock/stock.service.ts'
import { SyncService } from './modules/sync/sync.service.ts'
import { UserService } from './modules/user/user.service.ts'

export type AppVars = {
    db: DbConnection
    stockService: StockService
    userService: UserService
    leaderboardService: LeaderboardService
    syncService: SyncService
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
    ctx.stockService = new StockService(ctx)
    ctx.userService = new UserService(ctx)
    ctx.leaderboardService = new LeaderboardService(ctx)
    ctx.syncService = new SyncService(ctx)
    return ctx
}
