# Portfolio

Base path: `/api/public/v1/portfolio`

The API always acts on the **active portfolio belonging to the API key owner**. You never pass a `portfolioId` on the public surface.

## Get portfolio

`GET /api/public/v1/portfolio`

Requires scope: **`read`**

### curl

```bash
curl -sS \
  -H "Authorization: Bearer $SR_API_KEY" \
  "http://localhost:50030/api/public/v1/portfolio"
```

Response shape:

```json
{
  "data": {
    "portfolio": { "...": "..." },
    "holdings": [],
    "portfolioValue": 1000
  }
}
```

---

## Buy

`POST /api/public/v1/portfolio/buy`

Requires scope: **`trade`**

### Body

| Field | Type | Description |
|-------|------|-------------|
| `stockId` | string | Stock UUID |
| `quantity` | integer | Shares to buy (> 0) |
| `price` | number | Expected price per share |

### Price mismatch (409)

The `price` field is an **expected price** guard. The server compares it to the latest market price. If they differ, the request fails with **409** and `{ "error": "..." }`.

Always fetch the current quote first, then submit the trade with that price.

### curl

```bash
curl -sS -X POST \
  -H "Authorization: Bearer $SR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"stockId":"YOUR_STOCK_ID","quantity":1,"price":150.25}' \
  "http://localhost:50030/api/public/v1/portfolio/buy"
```

### JavaScript

```javascript
await fetch(`${baseUrl}/api/public/v1/portfolio/buy`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.SR_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ stockId, quantity: 1, price: 150.25 }),
});
```

### Python

```python
requests.post(
    f"{base_url}/api/public/v1/portfolio/buy",
    headers={"Authorization": f"Bearer {os.environ['SR_API_KEY']}"},
    json={"stockId": stock_id, "quantity": 1, "price": 150.25},
).raise_for_status()
```

---

## Sell

`POST /api/public/v1/portfolio/sell`

Same body and **409 price guard** as buy. Requires scope: **`trade`**.

```bash
curl -sS -X POST \
  -H "Authorization: Bearer $SR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"stockId":"YOUR_STOCK_ID","quantity":1,"price":150.25}' \
  "http://localhost:50030/api/public/v1/portfolio/sell"
```

---

## Performance

`GET /api/public/v1/portfolio/performance`

Requires scope: **`read`**

### Query parameters

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `granularity` | enum | `daily` | `daily`, `weekly`, `monthly`, or `yearly` |

```bash
curl -sS \
  -H "Authorization: Bearer $SR_API_KEY" \
  "http://localhost:50030/api/public/v1/portfolio/performance?granularity=daily"
```
