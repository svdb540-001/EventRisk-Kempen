# EventRisk Kempen – Update 5 Guards + Audit Logging

Update 5 verstevigt authz/authn met NestJS role guards, role decorators en audit logging.

## Wat is toegevoegd

### Backend (`apps/api`)

#### Role-based guards/decorators
- `src/roles.decorator.ts`
  - `@Roles(...roles)` metadata decorator
- `src/roles.guard.ts`
  - `RolesGuard` leest metadata en vergelijkt tegen `session.user.roles`
- `/admin` endpoint gebruikt nu:
  - `@UseGuards(RolesGuard)`
  - `@Roles('EventRisk.Admin')`

#### Audit logging
- `src/audit.service.ts`
  - Centrale audit log service met JSON payload
- Audit events toegevoegd op:
  - login redirect / login misconfig
  - callback success / callback failures
  - admin access allowed / denied
  - logout success / logout failure

#### Session hardening
- session cookie naam gewijzigd naar `eventrisk.sid`
- `rolling: true` toegevoegd
- `secure` cookie automatisch op basis van `NODE_ENV === 'production'`
- `.env.example` bevat nu ook `NODE_ENV`

## Let op (role configuratie)

`@Roles('EventRisk.Admin')` vereist dat de Entra `roles` claim exact deze role bevat.
Daarnaast valideert de endpoint ook `ENTRA_ADMIN_ROLE` (default idem).

Voor productie kun je beide op dezelfde env-gedreven constante laten uitkomen in een volgende refactor.

## Test

1. Start API + web
2. Login via `/auth/login`
3. Controleer `/auth/status`
4. Test `/admin`
   - zonder role: `403`
   - met role `EventRisk.Admin`: `200`
5. Bekijk API logs voor audit events
