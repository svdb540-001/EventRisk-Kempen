# EventRisk Kempen – Update 4 RBAC

Update 4 voegt role-based access control (RBAC) toe bovenop de Entra OAuth flow.

## Wat is toegevoegd

### Backend (`apps/api`)
- `SessionUser` uitgebreid met `roles: string[]`
- Roles claim mapping uit Entra `id_token` (`roles` claim)
- `ENTRA_ADMIN_ROLE` configuratie toegevoegd (default: `EventRisk.Admin`)
- `AuthService.isUserAdmin(...)` helper toegevoegd
- Nieuwe protected route: `GET /admin`
  - `401` als niet ingelogd
  - `403` als ingelogd zonder admin role
  - `200` met payload bij admin toegang

### Frontend (`apps/web`)
- Auth status page toont user roles
- Link toegevoegd om `/admin` endpoint te testen

### Config
- `.env.example` uitgebreid met `ENTRA_ADMIN_ROLE`

## Entra configuratie

In de App Registration:
1. Definieer app role, bijvoorbeeld `EventRisk.Admin`
2. Ken die role toe aan testgebruikers of groepen
3. Zorg dat role claim in token terechtkomt

## Testpad

1. Login via `/auth/login`
2. Open `/auth/status` en controleer roles
3. Open `/admin`
   - zonder role: verwacht `403`
   - met `EventRisk.Admin`: verwacht `200`
