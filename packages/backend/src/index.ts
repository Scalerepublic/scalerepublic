import { Hono } from 'hono'

import { registerExampleRoutes } from './modules/example/example.routes.ts'

export const createApp = () => {
    const app = new Hono()

    app.get('/health', (c) => c.json({ status: 'ok' }))
    registerExampleRoutes(app)

    return app
}

const app = createApp()

export { app }

export default {
    fetch: app.fetch,
    port: Number(process.env.PORT ?? 3000),
    hostname: '0.0.0.0',
}
