# ScaleRepublic frontend

The frontend is a SvelteKit application that renders authentication, market browsing, trading,
portfolio performance, leaderboard, notifications, and account settings. It uses the backend's
exported Hono type to keep API calls type-safe and TanStack Query to own server-state caching.

Start with the repository [README](../../README.md) for the complete first-time setup. For the
frontend's place in the system and an annotated source map, see the
[codebase guide](../../docs/codebase-guide.md#frontend-architecture).

## Local development

The recommended command runs PostgreSQL, migrations, backend, and frontend together:

```bash
cd ../..
just dev
```

If the backend and database are already running, this package can be started alone:

```bash
bun install --frozen-lockfile
bun run dev
```

The UI is served at <http://localhost:5173>. `src/hooks.server.ts` proxies `/api` requests to the
backend configured by `VITE_API_URL`, which defaults to <http://localhost:50030>.

## Source layout

| Path                     | Responsibility                                                         |
| ------------------------ | ---------------------------------------------------------------------- |
| `src/routes`             | SvelteKit pages and the global application layout                      |
| `src/lib/api`            | Typed client, backend-derived types, cache keys, and query definitions |
| `src/lib/data`           | Reactive Svelte query/mutation facades consumed by pages               |
| `src/lib/stores`         | Authentication, sidebar, and simulated-market UI state                 |
| `src/lib/components/app` | Reusable application components and trading sheets                     |
| `src/lib/mock`           | Static UI fixtures retained for offline development                    |
| `static`                 | Logos, favicon, and robots configuration                               |

## Validation

Run from this package:

```bash
bun run lint
bun run check
bun run build
```

Or run `just lint`, `just check`, `just build`, and `just test` from the repository root to verify
the complete application.

## Deployment

The package uses `@sveltejs/adapter-cloudflare`. `wrangler.jsonc` defines the frontend Worker and
`VITE_API_URL` controls the backend origin used by server-side proxying. Build and preview with:

```bash
bun run build
bun run cf:preview
```
