# ScaleRepublic – Architektur (Soll)

**TU Stock Exchange · PP3S 2026** — Stand: aktueller Integrations-Branch

Drei Schichten: **SvelteKit** (UI) → **Hono** (API) → **PostgreSQL** (Domäne + Kurse). Marktdaten per **Sync-Job** von externen APIs in `stock_price`; Trades und Portfolio nur über die API.

```plantuml
@startuml ScaleRepublic_Soll
skinparam shadowing false
skinparam defaultFontSize 12
skinparam rectangle {
  BackgroundColor #fafafa
  BorderColor #333
}

actor User

rectangle "Frontend\nSvelteKit" as FE {
  [Auth]
  [Market · Portfolio\nDashboard · Leaderboard]
}

rectangle "Backend\nBun + Hono" as BE {
  [better-auth]
  [Stock + Sync]
  [Portfolio + Trades]
  [User · Leaderboard]
}

database "PostgreSQL" as DB
cloud "Stock API\n(Vantage / Uni)" as EXT

User --> FE : HTTPS
FE --> BE : /api/auth/*\n/api/v1/*
BE --> DB
BE --> EXT : Sync (batch)

@enduml
```

| Schicht | Inhalt |
| -------- | ------ |
| **Frontend** | Login, Kurse/Handel, eigenes Portfolio, Rangliste |
| **Backend** | Session-Auth, Kurse aus DB, Buy/Sell + Ledger, Sync |
| **DB** | User, Portfolio, Trade, Stock, Stock-Preise |
