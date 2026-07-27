# API Spec (MVP – concept)

## Auth

### GET /auth/login
Start Entra ID login flow.

### GET /auth/callback
OIDC callback endpoint.

### GET /auth/me
Retourneert ingelogde gebruiker + rollen.

---

## Events

### GET /api/events
Filter op status, RN, gemeente, periode.

### POST /api/events
Nieuw dossier aanmaken.

### GET /api/events/{id}
Dossierdetail.

### PUT /api/events/{id}
Dossier updaten.

### POST /api/events/{id}/submit
Dossier indienen.

---

## Risk

### POST /api/events/{id}/risk-assessment
Slaat antwoorden/factoren op en berekent RN.

### GET /api/events/{id}/risk-assessment
Haalt huidige berekening op.

---

## Advice

### GET /api/events/{id}/advice
Lijst disciplineadviezen.

### PUT /api/events/{id}/advice/{discipline}
Adviestekst/status updaten.

---

## Documents

### POST /api/events/{id}/documents
Upload metadata + signed upload flow.

### GET /api/events/{id}/documents
Lijst documenten.

---

## Integrations

### POST /api/integrations/{platform}/sync
Handmatige synchronisatie triggeren.

### POST /api/integrations/{platform}/test
Connectiviteit testen.

### GET /api/integrations/sync-logs
Historiek ophalen.

### POST /api/events/{id}/feedback/push
Uitgaande terugkoppeling forceren.

---

## Webhooks (inbound)

### POST /webhooks/eaglebe
Ontvangt wijzigingsnotificaties Eaglebe.

### POST /webhooks/flowlab
Ontvangt wijzigingsnotificaties Flowlab.

---

## Health & Ops

### GET /health
Liveness/readiness.

### GET /metrics
Prometheus metrics (optioneel, intern).
