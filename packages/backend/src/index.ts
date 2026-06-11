import { createApp } from "./app.ts";
import { createAppContext } from "./context.ts";

const ctx = createAppContext();
const app = createApp(ctx);

export default {
    fetch: app.fetch,
    port: Number(process.env.PORT ?? 3000),
    hostname: "0.0.0.0",
};
