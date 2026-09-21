# Oplevernota — EventRisk Kempen 2.0 uitrolbaar

## Opgeleverd

- responsive EventRisk Kempen-webapp;
- toegang uitsluitend voor D1, D2, D3, coördinator en beheerder;
- Microsoft Entra ID-login en server-side token-/rolcontrole;
- PostgreSQL-productieopslag;
- Azure Blob Storage voor documenten;
- managed identity voor documentopslag;
- Azure Key Vault-reference voor het databasewachtwoord;
- productiestartblokkering bij development-auth, SQLite, lokale opslag of mockconnectoren;
- dashboard, dossiers, kalender, risicoanalyse en maatregelen;
- disciplinegebonden adviezen;
- documentuploads en beveiligde downloads;
- audit- en synchronisatielog;
- Eaglebe- en Flowlab-adapterlaag;
- mockdata voor lokale tests;
- inkomende import en uitgaande feedbackwachtrij;
- Docker Compose met PostgreSQL en Azurite;
- Bicep Infrastructure as Code;
- GitHub Actions CI en Azure-deployment via OIDC;
- healthcheck en smoke-test;
- expliciete diagnose voor de GitHub Pages/HTML-in-plaats-van-JSON-fout;
- zeer gedetailleerde uitrol- en go-livehandleidingen.

## Gevalideerd in deze oplevering

- syntaxcontrole geslaagd;
- vier automatische risicoberekeningstests geslaagd;
- lokale serverstart met SQLite geslaagd;
- `/api/public-config` levert JSON;
- `/api/health` levert `ok: true`;
- development D1-authenticatie via server geslaagd;
- productieregels zijn server-side afgedwongen.

## Extern nog nodig vóór echte live synchronisatie

1. formele goedkeuring van protocolwaarden en afrondingsregel;
2. definitieve Microsoft Entra-appregistraties en roltoewijzingen;
3. Azure-goedkeuring, kostenkeuze, netwerkkeuze en monitoring;
4. officiële Eaglebe sandbox- en productiegegevens;
5. officiële Flowlab sandbox- en productiegegevens;
6. definitieve payloads, veldmapping en schrijfbare velden;
7. privacy-, security- en continuïteitsbeoordeling;
8. acceptatietest en formele go/no-go.
