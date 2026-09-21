# EventRisk Kempen — uitrolbare versie 2.0

EventRisk Kempen is een beveiligde webtoepassing voor de hulpdiensten van de zone Kempen. Alleen gemachtigde medewerkers van D1, D2, D3, multidisciplinaire coördinatie en zonaal beheer kunnen aanmelden via Microsoft Entra ID. Gemeenten werken niet rechtstreeks in deze toepassing: evenementgegevens worden opgehaald uit Eaglebe en Flowlab en EventRisk-resultaten kunnen naar het oorspronkelijke loket worden teruggestuurd.

## Belangrijk: niet publiceren via GitHub Pages

GitHub Pages is uitsluitend statische hosting. EventRisk Kempen heeft een Node.js-server en API-routes zoals `/api/public-config`, `/api/events` en `/api/health` nodig.

Wanneer alleen de map `public` via GitHub Pages wordt gepubliceerd, antwoordt GitHub met HTML waar de interface JSON verwacht. De bekende fout is dan:

```text
Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

Gebruik GitHub voor broncode, versiebeheer en automatische uitrol. Open de toepassing na de uitrol via de Azure App Service-URL, bijvoorbeeld:

```text
https://eventrisk-kempen-....azurewebsites.net
```

## Wat is gewijzigd tegenover de pilot?

- PostgreSQL in productie in plaats van SQLite.
- Azure Blob Storage in productie in plaats van lokale uploads.
- Managed identity voor documentopslag; geen Storage-accountsleutel in de broncode.
- PostgreSQL-wachtwoord via Azure Key Vault-reference.
- Productiestart wordt geblokkeerd wanneer development-login, SQLite, lokale opslag of mockconnectoren nog actief zijn.
- Infrastructure as Code via `infra/main.bicep`.
- Automatische Azure-uitrol via GitHub Actions en OpenID Connect.
- Healthcheck op `/api/health`.
- Vriendelijk foutbericht wanneer de interface zonder API wordt geopend.
- Lokale ontwikkelmodus blijft beschikbaar met SQLite.
- Docker Compose bevat een productieachtige lokale test met PostgreSQL en Azurite.

## Start hier

Lees eerst:

1. [`docs/00-START-HIER-UITROLBAAR.md`](docs/00-START-HIER-UITROLBAAR.md)
2. [`docs/01-GITHUB-STAP-VOOR-STAP.md`](docs/01-GITHUB-STAP-VOOR-STAP.md)
3. [`docs/02-MICROSOFT-ENTRA-STAP-VOOR-STAP.md`](docs/02-MICROSOFT-ENTRA-STAP-VOOR-STAP.md)
4. [`docs/09-AZURE-UITROL-V2-STAP-VOOR-STAP.md`](docs/09-AZURE-UITROL-V2-STAP-VOOR-STAP.md)
5. [`docs/03-EAGLEBE-FLOWLAB-KOPPELING.md`](docs/03-EAGLEBE-FLOWLAB-KOPPELING.md)
6. [`docs/10-GO-LIVE-CHECKLIST.md`](docs/10-GO-LIVE-CHECKLIST.md)

## Lokaal starten met SQLite

Vereisten:

- Node.js 24 LTS;
- Git;
- een moderne browser.

Windows PowerShell:

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

Kies een lokale testrol. Deze rolkeuze bestaat niet in productie.

## Productieachtige lokale test met Docker

Vereisten:

- Docker Desktop.

Start PostgreSQL, Azurite en EventRisk:

```powershell
docker compose up --build
```

Open:

```text
http://localhost:3000
```

Stoppen:

```powershell
docker compose down
```

Alles inclusief lokale testdata verwijderen:

```powershell
docker compose down -v
```

## Technische architectuur

```text
Browser
  │ Microsoft Entra ID-token
  ▼
Azure App Service — Node.js 24
  ├─ EventRisk API en webinterface
  ├─ server-side rolcontrole D1/D2/D3/Admin
  ├─ PostgreSQL Flexible Server
  ├─ Azure Blob Storage via managed identity
  ├─ Azure Key Vault-reference voor databasesleutel
  └─ Eaglebe / Flowlab connectoradapters
```

## Productievoorwaarden

Bij `NODE_ENV=production` weigert de app te starten tenzij minimaal het volgende correct staat:

```env
AUTH_MODE=entra
DATABASE_PROVIDER=postgres
DATABASE_SSL=true
STORAGE_PROVIDER=azure
MOCK_CONNECTORS=false
```

Ook de Entra-, database- en Storage-waarden moeten aanwezig zijn.

## Controles

```powershell
npm run check
npm test
npm run smoke -- https://uw-eventrisk-url.azurewebsites.net
```

## Belangrijke beperking van de leverancierskoppelingen

De connectorcode en veldmapping zijn aanwezig, maar live synchronisatie kan pas worden geactiveerd na ontvangst en formele validatie van:

- officiële sandbox- en productie-endpoints;
- authenticatiemethode en credentials;
- inkomende payloads;
- schrijfbare velden;
- document-API;
- webhook- of pollingafspraken;
- foutcodes, snelheidslimieten en acceptatietests.

Er zijn bewust geen verzonnen productie-endpoints of onbevestigde schrijfoperaties ingebouwd.
