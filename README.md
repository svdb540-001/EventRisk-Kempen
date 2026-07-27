# EventRisk Kempen

Monorepo met:
- `apps/web` (Next.js)
- `apps/api` (NestJS)

## Development

```bash
npm install
npm run db:generate
npm run db:push
npm run dev:web
npm run dev:api
```

## Omgevingsvariabelen

Kopieer `.env.example` naar `.env` in de repo root.

## Database (Update 6)

SQLite + Prisma wordt gebruikt voor persistente opslag van:
- users
- audit logs

Nuttige commando's:

```bash
npm run db:generate
npm run db:push
npm run db:studio
```
