# Stocks

Base path: `/api/public/v1/stocks`

Requires scope: **`read`**

## List stocks

`GET /api/public/v1/stocks`

### Query parameters

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `q` | string | — | Search query |
| `sector` | string | — | Filter by sector |
| `page` | integer | `1` | Page number |
| `limit` | integer | `24` | Page size (max 48) |

### curl

```bash
curl -sS \
  -H "Authorization: Bearer $SR_API_KEY" \
  "http://localhost:50030/api/public/v1/stocks?q=AAPL&limit=10"
```

### JavaScript

```javascript
const res = await fetch(
  `${baseUrl}/api/public/v1/stocks?q=AAPL&limit=10`,
  { headers: { Authorization: `Bearer ${process.env.SR_API_KEY}` } },
);
const { data } = await res.json();
```

### Python

```python
import os, requests

r = requests.get(
    f"{base_url}/api/public/v1/stocks",
    params={"q": "AAPL", "limit": 10},
    headers={"Authorization": f"Bearer {os.environ['SR_API_KEY']}"},
)
r.raise_for_status()
data = r.json()["data"]
```

---

## Stock detail

`GET /api/public/v1/stocks/:ticker`

### Query parameters

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `historyDays` | integer | `30` | Quote history length (1–365) |

### curl

```bash
curl -sS \
  -H "Authorization: Bearer $SR_API_KEY" \
  "http://localhost:50030/api/public/v1/stocks/AAPL?historyDays=30"
```

Returns **404** when the ticker is unknown.
