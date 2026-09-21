# 09 — Azure-uitrol versie 2 stap voor stap

Deze handleiding plaatst de volledige EventRisk Kempen-toepassing online. Ze gebruikt de meegeleverde Bicep-template en GitHub Actions.

> Belangrijk: deze stappen maken betaalde Azure-resources. Laat SKU's, regio, back-up, netwerk en kosten vooraf door de Azure-beheerder goedkeuren.

---


## Optioneel: infrastructuur met één PowerShell-script starten

Na het invullen van de Entra-waarden kunt u vanuit de projectroot uitvoeren:

```powershell
.\scripts\deploy-infrastructure.ps1 `
  -TenantId "UW-TENANT-ID" `
  -SpaClientId "UW-SPA-CLIENT-ID" `
  -ApiClientId "UW-API-CLIENT-ID"
```

Het script maakt de resource group, start de Bicep-deployment en toont de Web App-URL. Azure vraagt interactief om het PostgreSQL-wachtwoord. De manuele stappen hieronder blijven nuttig om exact te begrijpen en te controleren wat er gebeurt.

---

# Deel 1 — Waarden verzamelen

## Stap 1 — Noteer de Microsoftwaarden

U hebt uit de Entra-handleiding nodig:

```text
Tenant ID
SPA Client ID
API Client ID
API Scope
```

De API-scope ziet er bijvoorbeeld zo uit:

```text
api://11111111-2222-3333-4444-555555555555/EventRisk.Access
```

## Stap 2 — Kies namen

Kies:

```text
Resource group: rg-eventrisk-kempen-prod
Azure-regio: westeurope
Prefix: eventriskkempenprod
PostgreSQL admin: eventriskadmin
```

De prefix moet uit kleine letters en cijfers bestaan. De template voegt een unieke suffix toe.

## Stap 3 — Kies SKU's

Voor acceptatie kunt u goedkoper starten:

```text
App Service: B1
PostgreSQL: Standard_B1ms
```

Voor een productieomgeving met Always On en meer marge is bijvoorbeeld mogelijk:

```text
App Service: P1v3
PostgreSQL: te bepalen op basis van belasting
```

Kies de definitieve grootte samen met de Azure-beheerder. Schaal later pas op basis van gemeten belasting.

---

# Deel 2 — Azure CLI voorbereiden

## Stap 4 — Open Azure Cloud Shell

1. Open de Azure Portal.
2. Meld aan met het juiste werkaccount.
3. Controleer rechtsboven de juiste directory.
4. Klik bovenaan op het Cloud Shell-icoon `>_`.
5. Kies **PowerShell** of **Bash**.
6. Kies het juiste abonnement wanneer daarom wordt gevraagd.

U kunt ook lokaal Azure CLI gebruiken.

## Stap 5 — Controleer het actieve abonnement

```powershell
az account show --output table
```

Controleer naam en subscription-id.

Zijn ze fout, toon alle abonnementen:

```powershell
az account list --output table
```

Selecteer het juiste abonnement:

```powershell
az account set --subscription "NAAM-OF-ID"
```

Controleer opnieuw:

```powershell
az account show --output table
```

## Stap 6 — Controleer Bicep

```powershell
az bicep version
```

Werkt dit niet:

```powershell
az bicep install
```

---

# Deel 3 — De projectbestanden beschikbaar maken

## Stap 7 — Open de lokale projectmap

Open PowerShell in de map waarin u ziet:

```text
server.mjs
package.json
infra
public
src
```

Controleer:

```powershell
Get-Location
Get-ChildItem
```

## Stap 8 — Meld Azure CLI aan

Wanneer u lokaal werkt:

```powershell
az login
```

Rond de browseraanmelding af.

---

# Deel 4 — Resource group maken

## Stap 9 — Maak de resource group

```powershell
az group create `
  --name rg-eventrisk-kempen-prod `
  --location westeurope
```

## Stap 10 — Controleer de resource group

```powershell
az group show `
  --name rg-eventrisk-kempen-prod `
  --output table
```

---

# Deel 5 — Parameterbestand maken

## Stap 11 — Kopieer het voorbeeld

```powershell
Copy-Item `
  infra/main.parameters.example.json `
  infra/main.parameters.prod.json
```

## Stap 12 — Open het productieparameterbestand

Open in Visual Studio Code:

```text
infra/main.parameters.prod.json
```

## Stap 13 — Vul de waarden in

Vervang de voorbeeldwaarden:

```json
{
  "parameters": {
    "prefix": { "value": "eventriskkempenprod" },
    "entraTenantId": { "value": "UW-TENANT-ID" },
    "entraSpaClientId": { "value": "UW-SPA-CLIENT-ID" },
    "entraApiClientId": { "value": "UW-API-CLIENT-ID" },
    "entraApiScope": { "value": "api://UW-API-CLIENT-ID/EventRisk.Access" },
    "postgresAdminUser": { "value": "eventriskadmin" },
    "appServiceSku": { "value": "P1v3" },
    "postgresSku": { "value": "Standard_B1ms" }
  }
}
```

Sla op.

## Stap 14 — Controleer dat er geen wachtwoord in het bestand staat

Het databasewachtwoord hoort niet in dit JSON-bestand en niet in GitHub.

Voer uit:

```powershell
git status
```

`infra/main.parameters.prod.json` staat door de meegeleverde `.gitignore` niet in Git. Controleer dit expliciet.

---

# Deel 6 — Bicep valideren

## Stap 15 — Bouw de Bicep-template lokaal

```powershell
az bicep build --file infra/main.bicep
```

Er mag geen syntaxisfout verschijnen.

Het gegenereerde `main.json` hoeft niet in Git te worden opgenomen.

## Stap 16 — Voer een what-if uit

```powershell
az deployment group what-if `
  --resource-group rg-eventrisk-kempen-prod `
  --template-file infra/main.bicep `
  --parameters infra/main.parameters.prod.json
```

Azure vraagt om het beveiligde parameter `postgresAdminPassword`.

Kies een sterk uniek wachtwoord dat voldoet aan het organisatiebeleid. Gebruik dit wachtwoord nergens anders.

Controleer welke resources zullen worden gemaakt.

---

# Deel 7 — Infrastructuur uitrollen

## Stap 17 — Start de deployment

```powershell
az deployment group create `
  --name eventrisk-infra-v2 `
  --resource-group rg-eventrisk-kempen-prod `
  --template-file infra/main.bicep `
  --parameters infra/main.parameters.prod.json
```

Omdat het wachtwoord niet in het parameterbestand staat, vraagt Azure er veilig om.

## Stap 18 — Wacht tot de deployment klaar is

De opdracht eindigt met een JSON-resultaat. Zoek:

```text
provisioningState: Succeeded
```

Bij een fout:

```powershell
az deployment group show `
  --resource-group rg-eventrisk-kempen-prod `
  --name eventrisk-infra-v2
```

Bekijk operaties:

```powershell
az deployment operation group list `
  --resource-group rg-eventrisk-kempen-prod `
  --name eventrisk-infra-v2 `
  --output table
```

## Stap 19 — Vraag de outputs op

```powershell
az deployment group show `
  --resource-group rg-eventrisk-kempen-prod `
  --name eventrisk-infra-v2 `
  --query properties.outputs
```

Noteer:

```text
webAppName
webAppUrl
storageAccountName
postgresServerName
keyVaultName
```

## Stap 20 — Controleer de resources in Azure Portal

Open de resource group. U moet minstens zien:

- App Service;
- App Service Plan;
- PostgreSQL Flexible Server;
- Storage Account;
- Key Vault;
- roltoewijzingen.

---

# Deel 8 — Microsoft redirect URI afwerken

## Stap 21 — Kopieer de Web App-URL

Voorbeeld:

```text
https://eventriskkempenprod-abc123.azurewebsites.net
```

Gebruik exact de output `webAppUrl`.

## Stap 22 — Open de SPA-appregistratie

1. Azure Portal.
2. **Microsoft Entra ID**.
3. **App registrations**.
4. Open **EventRisk Kempen Web**.
5. Klik **Authentication**.

## Stap 23 — Voeg de productie-redirect URI toe

1. Open of voeg platform **Single-page application** toe.
2. Voeg exact toe:

```text
https://UW-WEBAPP.azurewebsites.net
```

3. Voeg geen slash toe wanneer de URL zonder slash is geregistreerd.
4. Klik **Save**.

Laat voor lokale ontwikkeling ook staan:

```text
http://localhost:3000
```

## Stap 24 — Controleer accounttype

Voor uitsluitend de eigen organisatie kiest u:

```text
Accounts in this organizational directory only
```

Gebruik geen multitenantinstelling tenzij dit expliciet is goedgekeurd.

---

# Deel 9 — Eerste code-uitrol zonder GitHub Actions

Deze eenmalige handmatige uitrol helpt om infrastructuur en code apart te testen.

## Stap 25 — Installeer afhankelijkheden

```powershell
npm install
```

## Stap 26 — Voer controles uit

```powershell
npm run check
npm test
```

## Stap 27 — Maak een deployment-ZIP

Maak eerst een tijdelijke map:

```powershell
New-Item -ItemType Directory -Force .deploy
```

Kopieer de noodzakelijke bestanden:

```powershell
Copy-Item public .deploy/public -Recurse
Copy-Item src .deploy/src -Recurse
Copy-Item config .deploy/config -Recurse
Copy-Item fixtures .deploy/fixtures -Recurse
Copy-Item scripts .deploy/scripts -Recurse
Copy-Item server.mjs,package.json .deploy/
Copy-Item node_modules .deploy/node_modules -Recurse
```

Maak het ZIP-bestand:

```powershell
Compress-Archive `
  -Path .deploy/* `
  -DestinationPath eventrisk-deploy.zip `
  -Force
```

## Stap 28 — Rol het ZIP-bestand uit

Vervang de Web App-naam:

```powershell
az webapp deploy `
  --resource-group rg-eventrisk-kempen-prod `
  --name UW-WEBAPP-NAAM `
  --src-path eventrisk-deploy.zip `
  --type zip
```

## Stap 29 — Herstart de Web App

```powershell
az webapp restart `
  --resource-group rg-eventrisk-kempen-prod `
  --name UW-WEBAPP-NAAM
```

## Stap 30 — Controleer de healthcheck

Open in de browser:

```text
https://UW-WEBAPP.azurewebsites.net/api/health
```

Verwacht:

```json
{
  "ok": true,
  "app": "EventRisk Kempen",
  "database": "postgres",
  "storage": "azure"
}
```

U kunt ook uitvoeren:

```powershell
npm run smoke -- https://UW-WEBAPP.azurewebsites.net
```

---

# Deel 10 — Wanneer de app niet start

## Stap 31 — Bekijk de logstream

```powershell
az webapp log config `
  --resource-group rg-eventrisk-kempen-prod `
  --name UW-WEBAPP-NAAM `
  --application-logging filesystem `
  --level information
```

Open daarna:

```powershell
az webapp log tail `
  --resource-group rg-eventrisk-kempen-prod `
  --name UW-WEBAPP-NAAM
```

## Stap 32 — Herken productieconfiguratiefouten

EventRisk weigert bewust te starten bij bijvoorbeeld:

```text
AUTH_MODE moet entra zijn
DATABASE_PROVIDER moet postgres zijn
DATABASE_SSL moet true zijn
STORAGE_PROVIDER moet azure zijn
MOCK_CONNECTORS moet false zijn
```

Open in Azure Portal:

1. App Service.
2. **Settings → Environment variables**.
3. Controleer de waarde.
4. Klik **Apply**.
5. Herstart de app.

## Stap 33 — Controleer Key Vault-reference

Open App Service → Environment variables.

Zoek `DATABASE_PASSWORD`.

De Key Vault-reference moet als opgelost worden weergegeven. Is de status fout:

1. controleer dat de system-assigned managed identity actief is;
2. controleer de rol **Key Vault Secrets User**;
3. controleer of de secret bestaat;
4. wacht enkele minuten na een nieuwe roltoewijzing;
5. herstart de Web App.

## Stap 34 — Controleer PostgreSQL

Open PostgreSQL Flexible Server.

Controleer:

- status **Ready**;
- database `eventrisk` bestaat;
- firewallregel `AllowAzureServices` bestaat;
- TLS is actief;
- de App Service-instellingen bevatten correcte host, gebruiker en databasenaam.

De meegeleverde eerste uitrol gebruikt een firewallregel voor Azure-services. Laat voor een strengere productieomgeving VNet-integratie en private databaseconnectiviteit uitwerken.

## Stap 35 — Controleer Blob Storage

Open Storage Account → Containers.

Controleer:

- container `eventrisk-documents` bestaat;
- public access staat uit;
- de Web App-identiteit heeft **Storage Blob Data Contributor**;
- `AZURE_STORAGE_ACCOUNT_NAME` klopt.

---

# Deel 11 — GitHub Actions met OpenID Connect

## Stap 36 — Maak een deployment-appregistratie

1. Microsoft Entra ID.
2. App registrations.
3. New registration.
4. Naam:

```text
EventRisk Kempen GitHub Deployment
```

5. Kies single tenant.
6. Er is geen redirect URI nodig.
7. Klik Register.
8. Noteer Application (client) ID.
9. Noteer Directory (tenant) ID.

## Stap 37 — Voeg een federated credential toe

1. Open de deployment-appregistratie.
2. Klik **Certificates & secrets**.
3. Open tab **Federated credentials**.
4. Klik **Add credential**.
5. Kies scenario **GitHub Actions deploying Azure resources**.
6. Kies de juiste GitHub Organization.
7. Vul repository in:

```text
eventrisk-kempen
```

8. Entity type:

```text
Environment
```

9. Environment name:

```text
production
```

10. Geef de credential een herkenbare naam.
11. Klik Add.

De workflow gebruikt het GitHub Environment `production`; de federated credential moet daarmee overeenkomen.

## Stap 38 — Geef Azure-recht aan de deploymentidentiteit

1. Open de resource group `rg-eventrisk-kempen-prod`.
2. Open **Access control (IAM)**.
3. Klik **Add role assignment**.
4. Kies **Website Contributor** voor alleen Web App-uitrol, of een intern goedgekeurde minimale aangepaste rol.
5. Kies **User, group, or service principal**.
6. Selecteer `EventRisk Kempen GitHub Deployment`.
7. Bevestig.

Geef geen Owner- of Contributor-recht op het hele abonnement wanneer dat niet nodig is.

## Stap 39 — Maak GitHub Environment

1. Open de GitHub-repository.
2. Klik **Settings**.
3. Klik **Environments**.
4. Klik **New environment**.
5. Naam:

```text
production
```

6. Klik **Configure environment**.
7. Voeg eventueel required reviewers toe.
8. Beperk deployment branches tot `main`.

## Stap 40 — Voeg GitHub secrets toe

Open repository → Settings → Secrets and variables → Actions.

Voeg repository- of environmentsecrets toe:

```text
AZURE_CLIENT_ID
AZURE_TENANT_ID
AZURE_SUBSCRIPTION_ID
```

Waarden:

- `AZURE_CLIENT_ID`: client-id van de GitHub Deployment-app;
- `AZURE_TENANT_ID`: directory/tenant-id;
- `AZURE_SUBSCRIPTION_ID`: Azure subscription-id.

Voeg geen databasewachtwoord of leverancierssecret aan GitHub toe wanneer Key Vault kan worden gebruikt.

## Stap 41 — Voeg GitHub variables toe

Voeg onder **Variables** toe:

```text
AZURE_WEBAPP_NAME
EVENTRISK_APP_URL
```

Voorbeeld:

```text
AZURE_WEBAPP_NAME = eventriskkempenprod-abc123
EVENTRISK_APP_URL = https://eventriskkempenprod-abc123.azurewebsites.net
```

## Stap 42 — Start de workflow

1. Open tab **Actions**.
2. Kies **EventRisk naar Azure**.
3. Klik **Run workflow**.
4. Kies branch `main`.
5. Klik **Run workflow**.
6. Keur de environmentdeployment goed wanneer reviewers ingesteld zijn.

## Stap 43 — Controleer de workflow

De stappen moeten groen zijn:

1. code ophalen;
2. Node.js instellen;
3. afhankelijkheden installeren;
4. syntax en tests;
5. productiepakket maken;
6. aanmelden via OIDC;
7. uitrollen;
8. healthcheck.

---

# Deel 12 — De Microsoft-login testen

## Stap 44 — Open de Azure-URL

Gebruik niet de GitHub Pages-URL.

Open:

```text
https://UW-WEBAPP.azurewebsites.net
```

## Stap 45 — Meld aan met een toegewezen testgebruiker

1. Klik **Aanmelden met Microsoft**.
2. Kies het testaccount.
3. Verleen toestemming wanneer de beheerder dit niet vooraf centraal heeft gedaan.
4. Controleer naam en rol in de linkerzijbalk.

## Stap 46 — Test een gebruiker zonder rol

Meld aan met een account zonder EventRisk App Role.

Verwacht:

```text
Uw Microsoft-account heeft geen EventRisk-rol.
```

Deze gebruiker mag de toepassing niet binnenkomen.

## Stap 47 — Test iedere rol apart

- D1 kan D1-advies wijzigen.
- D2 kan D2-advies wijzigen.
- D3 kan D3-advies wijzigen.
- Coordinator kan gedeelde dossiergegevens beheren.
- Admin ziet Integraties en Auditlog.
- Geen enkele gemeente- of organisatorrol bestaat.

---

# Deel 13 — Eigen domein toevoegen

Doe dit pas na een geslaagde acceptatie.

## Stap 48 — Voeg custom domain toe

1. Open App Service.
2. Open **Custom domains**.
3. Klik **Add custom domain**.
4. Volg de DNS-validatie.
5. Activeer een App Service Managed Certificate of organisatiecertificaat.
6. Forceer HTTPS.

## Stap 49 — Pas Microsoft redirect URI aan

Voeg ook het eigen domein toe als SPA redirect URI:

```text
https://eventrisk.uwdomein.be
```

## Stap 50 — Pas APP_BASE_URL aan

Open App Service → Environment variables.

Wijzig:

```text
APP_BASE_URL=https://eventrisk.uwdomein.be
```

Sla op en herstart.

## Stap 51 — Pas GitHub variable aan

Wijzig:

```text
EVENTRISK_APP_URL=https://eventrisk.uwdomein.be
```

De healthcheck gebruikt vanaf dan het eigen domein.
