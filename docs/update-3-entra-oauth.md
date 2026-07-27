# EventRisk Kempen – Update 3 Entra OAuth (Authorization Code Flow)

Update 3 vervangt de placeholder login door een echte Microsoft Entra ID OAuth2
authorization code flow in de backend.

## Wat is toegevoegd

### Backend (`apps/api`)
- Nieuwe `AuthService` (`src/auth.service.ts`) met:
  - authorize URL builder
  - code exchange tegen Entra token endpoint
  - id_token decode en mapping naar session user
- `AppModule` registreert `AuthService`
- `GET /auth/login`
  - genereert CSRF `state`
  - bewaart state in session
  - redirect naar Entra authorize endpoint
- `GET /auth/callback`
  - valideert `state`
  - wisselt `code` in voor tokens
  - leest user uit `id_token`
  - zet user in session
  - redirect naar frontend `/auth/status`
- `GET /auth/me`
  - geeft echte sessiestatus terug
- `GET /auth/logout`
  - vernietigt session en wist cookie

### Config / env
- `.env.example` uitgebreid met:
  - `ENTRA_TENANT_ID`
  - `ENTRA_CLIENT_ID`
  - `ENTRA_CLIENT_SECRET`
  - `ENTRA_REDIRECT_URI`
  - `ENTRA_SCOPES`

## Vereiste Entra App Registration

- Redirect URI moet exact overeenkomen met `ENTRA_REDIRECT_URI`
  (standaard: `http://localhost:4000/auth/callback`)
- Scopes in deze update: `openid profile email User.Read`

## Lokale start

```bash
cp .env.example .env
cp apps/web/.env.local.example apps/web/.env.local
npm install
npm run dev:api
npm run dev:web
```

Open vervolgens `http://localhost:3000/auth/status` en kies login.
