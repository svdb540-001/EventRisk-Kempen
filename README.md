# EventRisk Kempen

Productieklaar evenementenportaal voor Brandweer Zone Kempen, gebaseerd op het bestaande webportaalpreventie-concept.

## Doel
EventRisk Kempen centraliseert:
- evenementendossiers
- risicoanalyse (D1/D2/D3)
- adviesworkflow
- documenten
- rapportering
- 2-way synchronisatie met Eaglebe en Flowlab

## Kernvereisten
1. Medewerkers loggen in met Microsoft (Entra ID).
2. Informatie uit Eaglebe en Flowlab wordt automatisch geïmporteerd in EventRisk.
3. Resultaten uit EventRisk (RN, discipline-scores, adviezen, status) worden automatisch teruggekoppeld naar Eaglebe en Flowlab.
4. Volledige audittrail en veilige, GDPR-conforme verwerking.

## MVP-scope
- Entra ID login + rolmapping
- Dossierbeheer en risicoanalyse
- Adviesflow D1/D2/D3
- Documentbeheer (metadata + opslagkoppeling)
- Integratielaag met queue/retry
- Sync dashboard (status, logs, handmatige hersturing)

## Architectuur op hoofdlijnen
- Frontend: React/Next.js
- Backend API: Node.js (NestJS) of .NET
- Database: PostgreSQL
- Queue: Redis + worker(s)
- Storage: Azure Blob Storage
- Auth: Microsoft Entra ID (OIDC/OAuth2)

## Documentatie
Zie `/docs`:
- `architecture.md`
- `backlog.md`
- `data-model.md`
- `api-spec.md`
- `security-gdpr.md`
- `integrations/mapping-eaglebe-flowlab.md`

## Volgende stap
1. Technische keuze backend finaliseren (.NET of Node.js).
2. Entra ID app registration opzetten.
3. Eaglebe/Flowlab API-contracten valideren met leveranciers.
4. MVP sprintplanning starten op basis van backlog.
