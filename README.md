Initial Setup: add to packages/backend/.env:
```
# BetterAuth
BETTER_AUTH_SECRET=yoursecret
BETTER_AUTH_URL=http://localhost:5173
DATABASE_URL=postgres://postgres:postgres@localhost:5432/scalerepublic
```

Then:

`just up && just db-migrate && just logs` — backend starts without BetterAuth schema errors

`bun run dev` in packages/frontend
