root := justfile_directory()
backend := root / "packages/backend"
frontend := root / "packages/frontend"

default:
    @just --list

setup:
    #!/usr/bin/env bash
    set -euo pipefail
    if [ ! -f "{{backend}}/.env" ]; then
      cp "{{backend}}/.env.example" "{{backend}}/.env"
      echo "Created packages/backend/.env from .env.example"
    fi
    if [ ! -f "{{frontend}}/.env" ]; then
      cp "{{frontend}}/.env.example" "{{frontend}}/.env"
      echo "Created packages/frontend/.env from .env.example"
    fi
    cd "{{backend}}" && bun install
    cd "{{frontend}}" && bun install

up:
    #!/usr/bin/env bash
    set -euo pipefail
    cd "{{backend}}"
    docker compose stop backend 2>/dev/null || true
    docker compose up -d postgres
    echo "Waiting for Postgres on localhost:50025…"
    until docker compose exec postgres pg_isready -U postgres -q; do sleep 1; done
    bun run db:migrate
    echo "Postgres is ready and migrations are applied."

dev: setup up
    #!/usr/bin/env bash
    set -euo pipefail
    echo ""
    echo "  Frontend → http://localhost:5173"
    echo "  Backend  → http://localhost:50030"
    echo "  Press Ctrl+C to stop."
    echo ""
    trap 'kill 0' INT TERM EXIT
    cd "{{backend}}" && bun run dev &
    cd "{{frontend}}" && bun run dev &
    wait

down:
    cd "{{backend}}" && docker compose down

logs:
    cd "{{backend}}" && docker compose logs -f

up-docker:
    cd "{{backend}}" && docker compose up --build -d

db-migrate:
    cd "{{backend}}" && bun run db:migrate

db-studio:
    cd "{{backend}}" && bun run db:studio

test:
    cd "{{backend}}" && just test

lint:
    cd "{{backend}}" && bun run lint
    cd "{{frontend}}" && bun run lint
