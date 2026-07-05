import { createApp, createWorkerContext, type WorkerBindings } from "./app.ts";
import { createAppContext } from "./context.ts";
import { parseTrackedTickers } from "./modules/sync/sync.service.ts";

const bunCtx = createAppContext();
const app = createApp(bunCtx);

if (typeof Bun !== "undefined" && process.env.NODE_ENV !== "test") {
    bunCtx.syncService.startScheduler().catch((err) => {
        console.error("[sync] Failed to start scheduler:", err);
    });
}

type CronController = { cron: string; scheduledTime: number };
type CronExecutionContext = { waitUntil(promise: Promise<unknown>): void };

export default {
    fetch: (request: Request, env: WorkerBindings, ctx: ExecutionContext) =>
        app.fetch(request, env, ctx),
    port: Number(process.env.PORT ?? 3000),
    hostname: "0.0.0.0",
    scheduled: async (
        _controller: CronController,
        env: WorkerBindings,
        ctx: CronExecutionContext,
    ): Promise<void> => {
        const { ctx: appCtx, client } = createWorkerContext(env);
        ctx.waitUntil(
            appCtx.syncService
                .runDueTick(parseTrackedTickers())
                .finally(() => client.end()),
        );
    },
};
