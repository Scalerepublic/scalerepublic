# Changelog

## v1 — initial public API

- Introduced `/api/public/v1` Bearer-authenticated surface.
- Scopes: `read`, `trade`.
- Endpoints:
  - `GET /stocks`
  - `GET /stocks/:ticker`
  - `GET /portfolio`
  - `POST /portfolio/buy`
  - `POST /portfolio/sell`
  - `GET /portfolio/performance`
- Per-key fixed-window rate limiting with `429` + `Retry-After`.
- Session-authenticated key management under `/api/v1/developer/*`.

### Future enhancements

- OpenAPI spec generated from route schemas.
- Cloudflare native rate limiting instead of DB-backed counters.
