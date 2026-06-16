import { createApp, createWorkerContext, type WorkerBindings } from "./app.ts";
import { createAppContext } from "./context.ts";
import { parseTrackedTickers } from "./modules/sync/sync.service.ts";

const app = createApp();

// Local Bun runtime only: start the in-process polling scheduler. On Cloudflare
// Workers this loop must never run — the Cron Trigger invokes `scheduled` below.
if (typeof Bun !== "undefined" && process.env.NODE_ENV !== "test") {
    createAppContext().syncService.startScheduler().catch((err) => {
        console.error("[sync] Failed to start scheduler:", err);
    });
}

type CronController = { cron: string; scheduledTime: number };
type CronExecutionContext = { waitUntil(promise: Promise<unknown>): void };

export default {
    // Cloudflare Workers and Bun both consume this `fetch` handler.
    fetch: app.fetch,
    // `port`/`hostname` are used by Bun and ignored by the Workers runtime.
    port: Number(process.env.PORT ?? 3000),
    hostname: "0.0.0.0",
    // Invoked by the Cloudflare Cron Trigger (no-op under Bun). Uses a
    // per-invocation DB connection and closes it when the work completes.
    scheduled: async (
        _controller: CronController,
        env: WorkerBindings,
        ctx: CronExecutionContext,
    ): Promise<void> => {
        const { ctx: appCtx, client } = createWorkerContext(env);
        ctx.waitUntil(
            appCtx.syncService
                .runDueTick(parseTrackedTickers())
                .then(() => appCtx.portfolioDefaultService.checkAllActivePortfolios())
                .finally(() => client.end()),
        );
    },
};
