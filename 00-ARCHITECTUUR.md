# 00 — Architectuur van EventRisk Kempen

## Doel

EventRisk Kempen is de afgeschermde werkruimte van de hulpdiensten. Gemeenten blijven hun eigen Eaglebe- of Flowlab-evenementenloket gebruiken. Zij krijgen geen account in EventRisk Kempen.

```text
Gemeente via Eaglebe / Flowlab
              │
              │ API, polling of beveiligde webhook
              ▼
      EventRisk connectorlaag
              │
              ▼
   Genormaliseerd evenementendossier
              │
      ┌───────┼────────┐
      ▼       ▼        ▼
     D1      D2       D3
  Brandweer Medisch  Politie
      │       │        │
      └───────┼────────┘
              ▼
  RN, maatregelen en adviezen
              │
              │ gecontroleerde terugkoppeling
              ▼
       Eaglebe / Flowlab
```

## Componenten

### Browserinterface

Bestanden in `public/`:

- Microsoft-login via MSAL;
- dashboard;
- dossierlijst en filters;
- dossierdetail;
- risicomatrix;
- disciplineadviezen;
- documenten;
- integratiebeheer voor beheerders.

### Server-API

`server.mjs` en `src/`:

- valideert Microsoft access tokens;
- controleert app-rollen server-side;
- voert risicoberekeningen uit;
- beheert dossiers en documenten;
- schrijft audit- en synchronisatielogs;
- communiceert met connectoren.

### Database

Lokaal gebruikt de ontwikkelmodus SQLite. In productie is PostgreSQL verplicht. Documenten worden in productie in een private Azure Blob-container bewaard via de managed identity van de Web App. Browser-localStorage is geen primaire dossieropslag.

### Connectorlaag

`src/integrations/`:

- Eaglebe-connector;
- Flowlab-connector;
- mockconnector;
- HTTP-client;
- veldmapping.

De leveranciersdata wordt vertaald naar één intern datamodel. Daardoor blijft de rest van de app onafhankelijk van leveranciersspecifieke veldnamen.

## Autorisatiemodel

| Rol | Belangrijkste rechten |
|---|---|
| EventRisk.Admin | integraties, audit, alle adviezen, functioneel beheer |
| EventRisk.Coordinator | gedeelde dossiergegevens en multidisciplinaire opvolging |
| EventRisk.D1 | lezen en D1-advies schrijven |
| EventRisk.D2 | lezen en D2-advies schrijven |
| EventRisk.D3 | lezen en D3-advies schrijven |

Er bestaan geen gemeente-, organisator- of burgerrollen.

## Synchronisatiemodel

### Inkomend

1. Connector haalt nieuwe/gewijzigde dossiers op.
2. Externe payload wordt genormaliseerd.
3. `source + externalId` voorkomt dubbels.
4. Bronvelden worden bijgewerkt.
5. RN wordt opnieuw berekend.
6. Synchronisatielog wordt geschreven.

### Uitgaand

1. Hulpdienst bewaart advies of relevante status.
2. Dossier krijgt `feedbackPending`.
3. Beheerder of automatische taak maakt de leverancierspayload.
4. Connector verstuurt de afgesproken velden.
5. Bij succes wordt wachtrij-item afgehandeld.
6. Bij fout blijven lokale gegevens behouden.

## Productie-evolutie

Voor een grotere productieomgeving zijn logische volgende stappen:

- beheerde PostgreSQL/Azure SQL;
- Blob Storage voor documenten;
- malware scanning;
- centrale job/queue voor sync;
- Key Vault;
- Application Insights/SIEM;
- leverancierwebhooks met HMAC en replaybescherming;
- PDF-adviesrapporten en digitale versiehistoriek.
