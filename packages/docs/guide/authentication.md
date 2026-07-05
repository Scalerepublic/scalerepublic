# Authentication

## Bearer tokens

Send your API key in the `Authorization` header:

```http
Authorization: Bearer sr_...
```

Keys always start with the `sr_` prefix followed by a high-entropy secret.

## Scopes

| Scope | Allows |
|-------|--------|
| `read` | `GET /stocks`, `GET /stocks/:ticker`, `GET /portfolio`, `GET /portfolio/performance` |
| `trade` | `POST /portfolio/buy`, `POST /portfolio/sell` (also requires portfolio ownership via the key) |

A key can include one or both scopes. Endpoints return **403** when the required scope is missing.

## Rotation

Rotating a key generates a new secret immediately. The previous secret stops working **without a grace period**.

Update every script, CI job, and secret store before rotating production keys.

## Storage

- Keep keys in environment variables or a secrets manager.
- Never commit keys to git or embed them in client-side code.
- Use separate keys per integration so you can revoke one without affecting others.

## Expiry

Keys may include an optional expiry timestamp. Expired keys return **401** on every request.

Check **Last used** in the API Keys UI to spot stale keys you can delete.
