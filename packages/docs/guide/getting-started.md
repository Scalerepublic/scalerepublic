# Getting started

## 1. Enable developer mode

1. Sign in to ScaleRepublic.
2. Open **Settings → Developer**.
3. Click **Enable** to activate developer mode for your account.

## 2. Create an API key

1. Open **API → API Keys** in the sidebar (visible after developer mode is enabled).
2. Click **Generate new key**.
3. Choose a name and scopes:
   - **read** — list stocks and read portfolio data
   - **trade** — buy and sell on your active portfolio
4. Copy the secret when it is shown. It is displayed **once** and cannot be retrieved later.

Store the key in an environment variable:

```bash
export SR_API_KEY="sr_..."
```

## 3. Make your first request

List stocks:

```bash
curl -sS \
  -H "Authorization: Bearer $SR_API_KEY" \
  "http://localhost:50030/api/public/v1/stocks?limit=5"
```

Read your portfolio:

```bash
curl -sS \
  -H "Authorization: Bearer $SR_API_KEY" \
  "http://localhost:50030/api/public/v1/portfolio"
```

Successful responses use `{ "data": ... }`. Errors use `{ "error": "..." }`.

## Base URL

| Environment | Base URL |
|-------------|----------|
| Local dev | `http://localhost:50030` |
| Production | Your deployed backend origin |

All public API routes are prefixed with `/api/public/v1`.
