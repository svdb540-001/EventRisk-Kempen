# EventRisk Kempen – Update 7 Session lifecycle + admin audit API

Update 7 focust op auth/session hardening, centrale error handling en admin observability.

## Toegevoegd

### 1) Refresh-token lifecycle
- `offline_access` scope toegevoegd in `.env.example`
- `AuthService` uitgebreid met:
  - `refreshAccessToken(refreshToken)`
  - `toSessionTokens(tokenResponse)`
  - `isAccessTokenExpired(...)`
- Sessietokens worden opgeslagen in session bij callback
- Bij `/auth/me` en `/events` wordt token freshness gecontroleerd
- Indien expired + refresh token aanwezig -> automatische refresh + audit event `auth.token.refreshed`

### 2) Centrale HTTP error handling
- Nieuwe globale exception filter: `HttpErrorFilter`
- Consistente error response shape:
  - `error`
  - `message`
  - `statusCode`
  - `path`
  - `timestamp`
- Exceptions worden geaudit met actie `http.exception`

### 3) Nieuwe admin endpoint voor audit logs
- `GET /admin/audit-logs`
- Alleen admin (RBAC)
- Query params:
  - `take` (1-100, default 20)
  - `skip` (default 0)
  - `action` (exact filter)
  - `email` (exact filter)
- Retourneert paginated payload met `total/take/skip/items`

### 4) Extra protected business endpoint
- `GET /events` toegevoegd
- Admin-only endpoint
- Demo dataset + audit event `events.read`

## Aangepast

### AuditService
- Nieuwe `list(...)` methode voor paginatie/filtering van audit logs
- Blijft writes naar DB doen via Prisma

### /auth/me response
- bevat nu ook token meta:
  - `expiresAt`
  - `scope`

## Testpad

1. Login via `/auth/login`
2. Check `/auth/me` (token meta zichtbaar)
3. Test `/events` als admin
4. Test `/admin/audit-logs?take=10&skip=0`
5. Forceer exception (bv. invalid query flow) en controleer consistente error response
