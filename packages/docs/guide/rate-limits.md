# Rate limits

Each API key has a fixed-window rate limit enforced on the server.

## Defaults

| Setting | Default |
|---------|---------|
| Window | 60 seconds |
| Max requests per window | 120 |

When the limit is exceeded the API returns **429 Too Many Requests** with a `Retry-After` header (seconds until the window resets).

## Example

```bash
curl -i \
  -H "Authorization: Bearer $SR_API_KEY" \
  "http://localhost:50030/api/public/v1/stocks"
```

```
HTTP/1.1 429 Too Many Requests
Retry-After: 42
Content-Type: application/json

{"error":"API key rate limit exceeded"}
```

## Client guidance

1. Respect `Retry-After` before retrying.
2. Use exponential backoff for bursty workloads.
3. Cache read responses where possible (stock lists, portfolio snapshots).

## Configuration

Operators can tune limits with backend environment variables:

| Variable | Description |
|----------|-------------|
| `API_KEY_RATE_LIMIT_WINDOW_MS` | Window length in milliseconds |
| `API_KEY_RATE_LIMIT_MAX_REQUESTS` | Maximum requests per window per key |
