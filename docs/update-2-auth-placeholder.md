# EventRisk Kempen – Update 2 Auth Placeholder

Deze update levert een functionele placeholder-auth flow op basis van cookie sessions,
zodat frontend en backend al correct kunnen integreren vóór de echte Entra OAuth
code exchange in Update 3.

## Toegevoegd

### Backend (`apps/api`)
- `@nestjs/config` toegevoegd voor env-config
- `cookie-parser` + `express-session` middleware in `main.ts`
- CORS met `credentials: true`
- Auth routes:
  - `GET /auth/login` → zet demo user in session en redirect naar frontend
  - `GET /auth/callback` → callback placeholder
  - `GET /auth/me` → geeft auth status + user terug
  - `GET /auth/logout` → destroy session + clear cookie

### Frontend (`apps/web`)
- Nieuwe route: `/auth/status`
- Server-side fetch naar `/auth/me`
- Login/logout links naar backend endpoints
- Homepagina linkt naar auth status

## Run

```bash
cp .env.example .env
cp apps/web/.env.local.example apps/web/.env.local
npm install
npm run dev:api
npm run dev:web
```

Open:
- Frontend: `http://localhost:3000/auth/status`
- API: `http://localhost:4000/auth/me`
