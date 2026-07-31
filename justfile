# Purpose: Provide repository-level setup, development, verification, database, and Docker commands.

root := justfile_directory()
backend := root / "packages/backend"
frontend := root / "packages/frontend"

default:
    @just --list

doctor:
    #!/usr/bin/env bash
    set -uo pipefail
    errors=0

    require_command() {
      local command_name="$1"
      if command -v "$command_name" >/dev/null 2>&1; then
        echo "[ok] $command_name: $(command -v "$command_name")"
      else
        echo "[error] Missing required command: $command_name"
        errors=$((errors + 1))
      fi
    }

    require_command bun
    require_command docker
    require_command git
    require_command just

    if command -v bun >/dev/null 2>&1; then
      bun_version="$(bun --version)"
      bun_major="${bun_version%%.*}"
      bun_minor_patch="${bun_version#*.}"
      bun_minor="${bun_minor_patch%%.*}"
      if (( bun_major > 1 || (bun_major == 1 && bun_minor >= 3) )); then
        echo "[ok] Bun $bun_version (requires 1.3+)"
      else
        echo "[error] Bun $bun_version is too old; install Bun 1.3 or newer"
        errors=$((errors + 1))
      fi
    fi

    if command -v docker >/dev/null 2>&1; then
      if docker info >/dev/null 2>&1; then
        echo "[ok] Docker daemon is running"
      else
        echo "[error] Docker is installed, but the daemon is not running"
        errors=$((errors + 1))
      fi

      if docker compose version >/dev/null 2>&1; then
        echo "[ok] $(docker compose version)"
      else
        echo "[error] Docker Compose is unavailable"
        errors=$((errors + 1))
      fi
    fi

    for port in 5173 50030 50025; do
      if bash -c "echo >/dev/tcp/127.0.0.1/$port" >/dev/null 2>&1; then
        echo "[error] Port $port is already in use"
        errors=$((errors + 1))
      else
        echo "[ok] Port $port is available"
      fi
    done

    if (( errors > 0 )); then
      echo "Doctor found $errors problem(s). Fix them and run 'just doctor' again."
      exit 1
    fi

    echo "All prerequisites are ready."

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

first-run:
    #!/usr/bin/env bash
    set -euo pipefail
    just doctor
    just setup
    just up
    just db-seed
    exec just dev

down:
    cd "{{backend}}" && docker compose down

logs:
    cd "{{backend}}" && docker compose logs -f

up-docker:
    cd "{{backend}}" && docker compose up --build -d

db-migrate:
    cd "{{backend}}" && bun run db:migrate

db-seed:
    cd "{{backend}}" && just db-seed

db-studio:
    cd "{{backend}}" && bun run db:studio

test:
    cd "{{backend}}" && just test

lint:
    cd "{{backend}}" && bun run lint
    cd "{{frontend}}" && bun run lint

check:
    cd "{{backend}}" && bun run check
    cd "{{frontend}}" && bun run check

build:
    cd "{{backend}}" && bun run build
    cd "{{frontend}}" && bun run build
