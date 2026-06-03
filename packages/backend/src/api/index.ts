import { Hono } from "hono";

import { type AppEnv } from "../context.ts";
import { leaderboardRoutes } from "../modules/leaderboard/leaderboard.routes.ts";
import { marketDebugRoutes } from "../modules/market-debug/market-debug.routes.ts";
import { portfolioRoutes } from "../modules/portfolio/portfolio.routes.ts";
import { stockRoutes } from "../modules/stock/stock.routes.ts";
import { userRoutes } from "../modules/user/user.routes.ts";

export const apiRoutes = new Hono<AppEnv>()
    .route("/", stockRoutes)
    .route("/", userRoutes)
    .route("/", leaderboardRoutes)
    .route("/", portfolioRoutes)
    .route("/", marketDebugRoutes);

export type ApiRoutesType = typeof apiRoutes;
