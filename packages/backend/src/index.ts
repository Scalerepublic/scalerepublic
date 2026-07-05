import type { ExecutionContext } from "@cloudflare/workers-types";

import { createApp, createWorkerContext, type WorkerBindings } from "./app.ts";
import { createAppContext } from "./context.ts";

const isBunRuntime = typeof Bun !== "undefined";
const bunCtx = isBunRuntime ? createAppContext() : undefined;
const app = createApp(bunCtx);

if (isBunRuntime && process.env.NODE_ENV !== "test" && bunCtx) {
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
                .runDueTick()
                .finally(() => client.end()),
        );
    },
};
