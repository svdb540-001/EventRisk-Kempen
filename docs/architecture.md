# Architectuur – EventRisk Kempen

## 1. Context
EventRisk Kempen is een webapplicatie voor gemeenten, disciplines (D1/D2/D3) en zonale beheerders.

Belangrijkste domeinen:
- Dossiers
- Risicoanalyse
- Adviezen
- Documenten
- Integraties (Eaglebe/Flowlab)
- Rapportering

## 2. Logische componenten

### Frontend (Web UI)
- Next.js/React SPA
- Role-based schermen
- Dossierwizard + detailpagina
- Synchronisatie-overzicht

### Backend API
- REST API
- AuthN/AuthZ middleware
- Domeinservices:
  - DossierService
  - RiskService
  - AdviceService
  - DocumentService
  - IntegrationService

### Integratie-engine
- Inbound connectors (Eaglebe, Flowlab)
- Outbound publisher
- Mapper (extern <-> canoniek)
- Queue + retries + dead-letter
- Sync state machine

### Persistente laag
- PostgreSQL
- Object storage (Azure Blob)
- Auditlog/tabellen voor synchronisatie

## 3. Canoniek datamodel
EventRisk gebruikt intern 1 canoniek model. Externe velden worden gemapt.

- `events`
- `risk_assessments`
- `advice_requests`
- `documents`
- `external_links`
- `sync_queue`
- `sync_logs`

## 4. Authenticatie & autorisatie
- Microsoft Entra ID (OIDC)
- Access token validatie op backend
- Rollen via app roles of group mapping
- Fine-grained autorisatie op endpoints

## 5. 2-way synchronisatie

### Inbound flow (Eaglebe/Flowlab -> EventRisk)
1. Webhook of polling detecteert wijziging.
2. Connector haalt payload op.
3. Mapper vertaalt naar canoniek model.
4. Upsert op basis van `(platform, external_id)`.
5. Sync log + audit event.

### Outbound flow (EventRisk -> Eaglebe/Flowlab)
1. Domeinwijziging triggert outbound event.
2. Queue item aangemaakt.
3. Worker verstuurt mapped payload.
4. Bij succes: status `synced`.
5. Bij fout: retry/backoff, daarna `dead_letter`.

## 6. Conflictstrategie
Per veld wordt `source_of_truth` afgesproken:
- Organisatorische aanvraagvelden: extern leidend (Eaglebe/Flowlab)
- Risicoberekening + RN + disciplineadvies: EventRisk leidend
- Statusvelden: regels per statusstap en synchronisatierichting

## 7. Observability
- Structured logging
- Metrics:
  - sync success rate
  - retry count
  - dead-letter count
  - avg sync latency
- Dashboard voor beheer

## 8. Security
- TLS overal
- Encryptie-at-rest
- Secrets via secure vault
- Least privilege service accounts
- Audittrail niet manipuleerbaar
