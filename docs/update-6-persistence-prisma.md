# EventRisk Kempen – Update 6 Persistente opslag (Prisma + SQLite)

Update 6 voegt persistente opslag toe voor users en audit logs, met Prisma + SQLite.

## Wat is toegevoegd

### Database
- Prisma schema toegevoegd: `apps/api/prisma/schema.prisma`
- SQLite datasource via `DATABASE_URL`
- Modellen:
  - `User`
  - `AuditLog`

### Backend services
- `PrismaService` toegevoegd voor DB connect lifecycle
- `UsersService` toegevoegd:
  - upsert user bij login callback
  - profile lookup op basis van Entra object id
- `AuditService` schrijft nu ook naar `AuditLog` tabel

### Auth flow integratie
- Bij succesvolle callback:
  - session user gezet
  - user ge-upsert in DB
  - audit log met DB user context
- `/auth/me` geeft nu ook `profile` terug indien aanwezig
- `/admin` geeft ook gekoppeld DB profile mee

### Workspace scripts
- Root `package.json` scripts toegevoegd:
  - `db:generate`
  - `db:push`
  - `db:studio`
- API package scripts idem toegevoegd

## Setup

```bash
cp .env.example .env
npm install
npm run db:generate
npm run db:push
npm run dev:api
npm run dev:web
```

## Verifiëren

1. Login flow uitvoeren
2. `GET /auth/me` checken op `profile`
3. `npm run db:studio` openen en `User` + `AuditLog` records controleren
