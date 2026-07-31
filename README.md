# ScaleRepublic

ScaleRepublic is a toy stock exchange built for PP3S. It uses a SvelteKit frontend, a Bun/Hono backend, and PostgreSQL. The default local configuration runs with simulated stock data, so no external API credentials are needed.

## Features

- Email/password accounts with an automatically created portfolio
- Market browsing, search, stock details, and price history
- Buy and sell orders with live portfolio values
- Limit orders and stop orders
- Leaderboard, notifications, account settings, and account deletion
- Simulated market controls for repeatable local development

![ScaleRepublic portfolio dashboard](docs/assets/scale-republic-dashboard.png)

## Architecture

```mermaid
flowchart LR
    Browser["Browser"] --> Frontend["SvelteKit frontend<br/>localhost:5173"]
    Frontend -->|"/api proxy and SSR requests"| Backend["Bun + Hono backend<br/>localhost:50030"]
    Backend --> Database[("PostgreSQL 16<br/>localhost:50025")]
    Backend --> Scheduler["Price sync and<br/>order scheduler"]
    Scheduler --> Database
    Backend -. "optional live prices" .-> MarketAPI["Uni API proxy or<br/>Alpha Vantage"]
```

## Prerequisites

Install these tools before cloning the repository:

- [Git](https://git-scm.com/downloads)
- [Bun](https://bun.sh) 1.3 or newer
- [Docker Desktop](https://docs.docker.com/get-docker/) or Docker Engine with Compose
- [just](https://github.com/casey/just) task runner

Docker must be running before you start the application. On Windows, use WSL2 and enable Docker Desktop's WSL integration.

After cloning, the repository can confirm the tools, Docker daemon, and required ports:

```bash
just doctor
```

## First-time setup

Clone the repository and enter it:

```bash
git clone https://github.com/daviidoff/scalerepublic.git
cd scalerepublic
```

From the repository root, run one command:

```bash
just first-run
```

`just first-run` checks the prerequisites, creates the local `.env` files, installs dependencies, starts PostgreSQL, applies migrations, safely seeds the simulated market, and launches the backend and frontend.

Open <http://localhost:5173>, select **Create account**, and sign up. Users are not seeded; signing up creates the user's first portfolio.

`just dev` remains attached to both development servers. Press `Ctrl+C` to stop them. PostgreSQL keeps running in Docker so its data is preserved.

## Daily development

After the first-time setup, one command starts the complete development environment:

```bash
just dev
```

The command installs any changed dependencies, starts PostgreSQL, applies pending migrations, and launches both development servers:

| Service | URL |
| --- | --- |
| Frontend | <http://localhost:5173> |
| Backend health check | <http://localhost:50030/health> |
| PostgreSQL | `localhost:50025` |
| Drizzle Studio (optional) | <http://localhost:4983> |

Stop PostgreSQL and the optional Docker backend when finished:

```bash
just down
```

The database volume is retained by `just down`, so the next start uses the same data.

## Verify the installation

While `just dev` is running, these checks should succeed in another terminal:

```bash
curl --fail http://localhost:50030/health
curl --fail --head http://localhost:5173
```

The health endpoint returns `{"status":"ok"}`. You should also be able to create an account, open the Market page, and see the 10 simulated stocks added by `just db-seed`.

Run the project checks from the repository root:

```bash
just lint
just check
just build
just test
```

`just test` builds an isolated Docker test stack, applies migrations to a temporary database, runs the backend integration tests, and removes the test containers afterward.

## Common commands

| Command | Description |
| --- | --- |
| `just doctor` | Check required tools, Docker, and local port availability |
| `just first-run` | Prepare a fresh checkout, seed it, and start the complete app |
| `just dev` | Start PostgreSQL, migrate, and run the local backend and frontend |
| `just setup` | Install dependencies and create missing local `.env` files |
| `just up` | Start PostgreSQL and apply pending migrations |
| `just down` | Stop Docker services without deleting database data |
| `just db-migrate` | Apply pending migrations to the local database |
| `just db-seed` | Add missing simulated stocks and historical prices; safe to rerun |
| `just db-studio` | Open Drizzle Studio |
| `just up-docker` | Build and run both PostgreSQL and the backend in Docker |
| `just lint` | Lint backend and frontend code and check frontend formatting |
| `just check` | Type-check backend and frontend code |
| `just build` | Create backend and frontend production builds |
| `just test` | Run the backend integration tests in isolated containers |

Package-specific commands are documented in `packages/backend/README.md` and the package `justfile` files.

## Local environment

`just setup` creates these ignored files when they do not exist:

- `packages/backend/.env` from `packages/backend/.env.example`
- `packages/frontend/.env` from `packages/frontend/.env.example`

The checked-in defaults are ready for simulated local development:

| Variable | Local value | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | `postgres://postgres:postgres@localhost:50025/scalerepublic` | Database used by host-side Bun and migration commands |
| `PORT` | `50030` | Backend development server port |
| `BETTER_AUTH_SECRET` | Development placeholder | Signs authentication sessions; replace outside local development |
| `BETTER_AUTH_URL` | `http://localhost:5173` | Public origin used for local authentication |
| `STOCK_DEBUG` | `true` | Enables simulated prices and market debug controls |
| `SEED_MONTHS` / `SEED_RNG_SEED` | `2` / `42` | Controls the size and reproducibility of local seed data |
| `VITE_API_URL` | `http://localhost:50030` | Backend origin used by frontend SSR |

For anything other than throwaway local development, replace `BETTER_AUTH_SECRET` with a random secret, for example:

```bash
openssl rand -base64 32
```

Live market data is optional. `STOCK_API_PROVIDER`, `UNI_API_*`, and `ALPHAVANTAGE_API_KEY` are only needed when `STOCK_DEBUG=false`. The complete backend variable reference is in `packages/backend/README.md`.

## Local backend versus Docker backend

`just dev` is the recommended workflow. It runs PostgreSQL in Docker and starts the backend with Bun's hot reload on the host, so code changes are immediately visible.

To run the backend in Docker instead:

```bash
just up-docker
```

The container contains built code and must be rebuilt after code changes:

```bash
cd packages/backend
docker compose up --build -d backend
```

Do not run the local backend and Docker backend at the same time because both use port `50030`.

## Troubleshooting

### Cannot connect to the Docker daemon

Start Docker Desktop or the Docker Engine, wait until `docker info` succeeds, and rerun the command.

### Port already in use

The application needs ports `5173`, `50030`, and `50025`. Stop the conflicting process. If an older Docker backend owns port `50030`, run:

```bash
cd packages/backend
docker compose stop backend
```

### The Market page is empty

Seed the local database from the repository root:

```bash
just db-seed
```

The seed command skips stocks that already have price history, so it is safe to rerun. To deliberately generate another seed window, run `SEED_FORCE=true just db-seed`.

### The backend URL shows `404 Not Found`

The backend does not serve a page at `/`. Use <http://localhost:50030/health> to check it, and use the frontend at <http://localhost:5173> for the application UI.

### Dependency or generated Svelte files are stale

Rerun setup and the checks:

```bash
just setup
just check
```

## Cloudflare Workers (optional)

To test the production Workers runtime locally:

```bash
# Terminal 1: PostgreSQL and migrations
just up

# Terminal 2: backend Worker
cd packages/backend && bun run cf:dev

# Terminal 3: frontend Worker
cd packages/frontend && bun run cf:preview
```

Create `packages/backend/.dev.vars` for Wrangler secrets such as `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL`. See `packages/backend/wrangler.jsonc` and `packages/backend/README.md` for staging and production deployment details.
