# Errors

All public API errors return JSON:

```json
{ "error": "Human-readable message" }
```

## HTTP status codes

| Status | Meaning |
|--------|---------|
| **401** | Missing/malformed `Authorization` header, invalid key, or expired key |
| **403** | Key is valid but missing the required scope, or account/portfolio is not allowed to trade |
| **404** | Resource not found (unknown ticker, no active portfolio) |
| **409** | Price mismatch on buy/sell (`expectedPrice` contract — see Portfolio docs) |
| **422** | Validation error or business rule failure (insufficient funds/holdings, key limit) |
| **429** | Rate limit exceeded — see `Retry-After` |
| **500** | Unexpected server error |

## Validation

Request bodies and query parameters are validated with Zod. Invalid input typically returns **400** with a generic validation message from the framework layer.

## Example error handling (JavaScript)

```javascript
const res = await fetch(`${baseUrl}/api/public/v1/portfolio/buy`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.SR_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ stockId, quantity: 1, price: 100 }),
});

const body = await res.json();
if (!res.ok) {
  throw new Error(body.error ?? res.statusText);
}
```
