# Vervangen handleiding

Deze oudere pilothandleiding gebruikt lokale SQLite-opslag en is niet meer de aanbevolen uitrolroute. Gebruik voor versie 2.0 uitsluitend [`09-AZURE-UITROL-V2-STAP-VOOR-STAP.md`](09-AZURE-UITROL-V2-STAP-VOOR-STAP.md).

---

# 06 — EventRisk Kempen stap voor stap op Azure plaatsen

Deze handleiding beschrijft een praktische eerste Azure-uitrol met een container. Voor een echte productieomgeving laat u netwerk, back-up, monitoring en databasekeuze beoordelen door de IT- en securityverantwoordelijken.

De meegeleverde SQLite-versie vereist bij deze aanpak één actieve appinstantie en blijvende opslag. Voor schaalvergroting migreert u eerst naar een beheerde database.

---

## Architectuur voor de eerste piloot

- GitHub: broncode en CI;
- Azure Container Registry (ACR): containerimage;
- Azure App Service for Containers: webapp;
- Azure Storage of persistent App Service-opslag: data/uploads voor piloot;
- Azure Key Vault: secrets;
- Microsoft Entra ID: gebruikerslogin;
- Application Insights/Log Analytics: monitoring.

---

## Deel A — Azure voorbereiden

### Stap 1 — Kies abonnement en regio

1. Meld aan in Azure Portal.
2. Controleer het juiste abonnement.
3. Kies bij voorkeur een regio volgens het organisatiebeleid en gegevensvereisten.
4. Noteer de afgesproken naamconventie.

Voorbeelden:

```text
Resource group: rg-eventrisk-prod-weu
Container registry: acreventriskprod
Web app: app-eventrisk-prod
Key Vault: kv-eventrisk-prod
```

Namen moeten mogelijk uniek zijn.

### Stap 2 — Maak de resource group

1. Zoek **Resource groups**.
2. Klik op **Create**.
3. Kies subscription.
4. Vul naam en regio in.
5. Voeg tags toe, bijvoorbeeld eigenaar, omgeving en kostencentrum.
6. Klik op **Review + create**.
7. Klik op **Create**.

---

## Deel B — Container Registry

### Stap 3 — Maak ACR

1. Zoek **Container registries**.
2. Klik op **Create**.
3. Kies de resource group.
4. Vul een unieke registrynaam in.
5. Kies een passende SKU; voor een piloot kan Basic volstaan.
6. Laat **Admin user** uit wanneer managed identity gebruikt wordt.
7. Klik op **Review + create** en **Create**.

### Stap 4 — Bouw eerst lokaal met Docker

In de projectmap:

```powershell
docker build -t eventrisk-kempen:local .
```

Start de container:

```powershell
docker run --rm -p 3000:3000 --env-file .env eventrisk-kempen:local
```

Open `http://localhost:3000` en voer de basistests uit.

### Stap 5 — Kies de buildmethode

Aanbevolen: GitHub Actions bouwt na goedkeuring de image en pusht naar ACR. Maak dit pas nadat de eerste repository en Azure-resources zijn goedgekeurd.

Alternatief voor een eerste beheerderstest via Azure CLI:

```powershell
az login
az acr login --name acreventriskprod
docker tag eventrisk-kempen:local acreventriskprod.azurecr.io/eventrisk-kempen:1.0.0
docker push acreventriskprod.azurecr.io/eventrisk-kempen:1.0.0
```

Gebruik een versietag; gebruik niet uitsluitend `latest`.

---

## Deel C — Key Vault

### Stap 6 — Maak Key Vault

1. Zoek **Key vaults**.
2. Klik op **Create**.
3. Kies resource group, naam en regio.
4. Kies RBAC-toegangsmodel volgens organisatiebeleid.
5. Schakel soft delete/purge protection in volgens beleid.
6. Maak de vault.

### Stap 7 — Voeg secrets toe

Maak afzonderlijke secrets voor bijvoorbeeld:

```text
EAGLEBE-CLIENT-SECRET
FLOWLAB-API-KEY
FLOWLAB-WEBHOOK-SECRET
```

Niet-geheime waarden zoals tenant ID en client ID mogen als gewone app setting worden bewaard, maar centrale configuratie kan nog steeds wenselijk zijn.

### Stap 8 — Noteer de secret-URI's

Open elk secret en noteer de versie-onafhankelijke URI wanneer App Service Key Vault-references gebruikt worden.

---

## Deel D — App Service maken

### Stap 9 — Maak het App Service Plan

1. Zoek **App Service plans**.
2. Klik **Create**.
3. Kies Linux.
4. Kies de resource group en regio.
5. Kies een SKU passend bij de piloot.
6. Voor productie is een SKU nodig die back-up, custom domains en voldoende beschikbaarheid ondersteunt.

### Stap 10 — Maak de Web App

1. Zoek **App Services**.
2. Klik **Create → Web App**.
3. Kies:
   - Publish: `Container`;
   - Operating System: `Linux`;
   - juiste resource group;
   - bestaand App Service Plan.
4. Kies als image source **Azure Container Registry**.
5. Selecteer registry, repository en vaste tag.
6. Maak de webapp.

### Stap 11 — Zet managed identity aan

1. Open de webapp.
2. Ga naar **Identity**.
3. Onder **System assigned** zet u status op **On**.
4. Klik **Save**.
5. Noteer de Object ID.

### Stap 12 — Geef ACR pull-recht

1. Open ACR.
2. Ga naar **Access control (IAM)**.
3. Klik **Add role assignment**.
4. Kies `AcrPull`.
5. Kies managed identity.
6. Selecteer de webapp.
7. Bevestig.

### Stap 13 — Geef Key Vault-leesrecht

1. Open Key Vault.
2. Ga naar **Access control (IAM)**.
3. Voeg passende secret-leesrol toe aan de managed identity van de webapp.
4. Geef geen schrijf- of beheerrecht wanneer dit niet nodig is.

---

## Deel E — App settings configureren

### Stap 14 — Open Configuration

1. Open de webapp.
2. Ga naar **Environment variables** of **Configuration**.
3. Voeg per regel één instelling toe.

Minimaal:

```text
NODE_ENV = production
PORT = 3000
AUTH_MODE = entra
APP_BASE_URL = https://<uw-webapp-host>
ENTRA_TENANT_ID = <tenant-id>
ENTRA_SPA_CLIENT_ID = <spa-client-id>
ENTRA_API_CLIENT_ID = <api-client-id>
ENTRA_API_SCOPE = api://<api-client-id>/EventRisk.Access
ENTRA_ALLOWED_TENANT_ID = <tenant-id>
ENTRA_ALLOWED_ROLES = EventRisk.Admin,EventRisk.Coordinator,EventRisk.D1,EventRisk.D2,EventRisk.D3
MOCK_CONNECTORS = false
```

### Stap 15 — Voeg Key Vault-references toe

Gebruik voor een secret een Key Vault-reference volgens de Azure-interface, bijvoorbeeld conceptueel:

```text
EAGLEBE_CLIENT_SECRET = @Microsoft.KeyVault(SecretUri=...)
```

Gebruik de exacte door Azure gegenereerde syntax en controleer dat de status van de reference groen/opgelost is.

### Stap 16 — Configureer connectorwaarden

Voeg alleen door leveranciers bevestigde waarden toe. Begin met:

```text
EAGLEBE_ENABLED = false
FLOWLAB_ENABLED = false
SYNC_AUTOMATIC = false
```

Activeer pas na de afzonderlijke integratietest.

### Stap 17 — Configureer persistente data voor de pilot

SQLite en uploads mogen niet verdwijnen bij containervervanging.

Mogelijkheden:

1. App Service persistent storage correct mounten;
2. Azure Files mount gebruiken;
3. beter voor productie: database migreren naar beheerde DB en documenten naar Blob Storage.

Zet daarna:

```text
DATABASE_PATH = /pad/naar/persistente-opslag/eventrisk.db
UPLOAD_DIR = /pad/naar/persistente-opslag/uploads
```

Controleer na een herstart dat dossiers blijven bestaan.

---

## Deel F — Microsoft redirect URI aanpassen

### Stap 18 — Noteer de echte HTTPS-URL

Open de webapp en kopieer de standaardhostname of het custom domain.

### Stap 19 — Voeg de URL in Entra toe

1. Open **EventRisk Kempen Web** in Entra.
2. Ga naar **Authentication**.
3. Voeg als SPA redirect URI exact toe:

```text
https://<uw-webapp-host>
```

4. Sla op.
5. Pas `APP_BASE_URL` aan als die nog niet overeenkomt.

---

## Deel G — Eerste start testen

### Stap 20 — Bekijk de log stream

1. Open **Log stream**.
2. Herstart de webapp.
3. Controleer:
   - server luistert op poort 3000;
   - authenticatiemodus `entra`;
   - geen ontbrekende Entra-waarden;
   - geen development-login in productie.

### Stap 21 — Open health endpoint

Open:

```text
https://<host>/api/health
```

Verwacht status `ok` zonder gevoelige configuratiewaarden.

### Stap 22 — Test login

1. Open InPrivate.
2. Meld aan met toegewezen testbeheerder.
3. Controleer rol.
4. Test een gebruiker zonder rol.
5. Test D1/D2/D3 afzonderlijk.

### Stap 23 — Test persistentie

1. Maak/importeer een testdossier.
2. Herstart de webapp.
3. Controleer dat het dossier nog bestaat.
4. Is het weg, activeer connectoren nog niet en herstel eerst de opslag.

---

## Deel H — Custom domain en TLS

### Stap 24 — Voeg custom domain toe

1. Kies een domein, bijvoorbeeld `eventrisk.organisatie.be`.
2. Volg in App Service **Custom domains** de DNS-verificatie.
3. Voeg de vereiste CNAME/TXT-records toe bij de DNS-beheerder.
4. Wacht op validatie.

### Stap 25 — Activeer certificaat

1. Maak of koppel een beheerd certificaat volgens Azure-mogelijkheden en beleid.
2. Bind het certificaat aan het domein.
3. Zet **HTTPS Only** aan.
4. Test certificaatketen en vervaldatum.

### Stap 26 — Werk Entra opnieuw bij

Voeg de custom domain-URL exact toe als SPA redirect URI en wijzig `APP_BASE_URL`.

---

## Deel I — Monitoring

### Stap 27 — Activeer Application Insights

1. Open de webapp.
2. Activeer Application Insights of koppel een bestaande resource.
3. Stel retentie volgens beleid in.
4. Controleer dat tokens en secrets niet in telemetry terechtkomen.

### Stap 28 — Maak alerts

Minimaal:

- webapp niet beschikbaar;
- veel HTTP 5xx;
- hoge responstijd;
- herstarts/crashes;
- schijfruimte/persistente opslag;
- groei synchronisatiefouten;
- connector langer dan afgesproken niet succesvol.

### Stap 29 — Maak een dashboard

Toon:

- beschikbaarheid;
- API-fouten;
- aanmeldfouten;
- inkomende en uitgaande sync;
- wachtrijgrootte;
- laatste succesvolle sync per platform;
- appversie.

---

## Deel J — GitHub Actions voor deployment

De meegeleverde workflow controleert code en tests. Voeg deployment pas toe nadat Azure-identiteit en goedkeuringsproces zijn bepaald.

Aanbevolen:

1. gebruik GitHub OpenID Connect naar Azure, geen langlevend publish-password;
2. maak een Azure federated credential voor de GitHub-repository/omgeving;
3. geef alleen ACR push en noodzakelijke deployrechten;
4. gebruik GitHub Environments `test` en `production`;
5. vereis handmatige goedkeuring voor productie;
6. bouw één image;
7. scan de image;
8. push met commit-SHA en versietag;
9. deploy exact die tag;
10. voer health check en smoke test uit.

---

## Deel K — Productiecheck

Voor ingebruikname:

- [ ] HTTPS en custom domain werken;
- [ ] Entra zonder rol wordt geweigerd;
- [ ] alle vijf rollen getest;
- [ ] gemeenten hebben geen rol;
- [ ] development-login geblokkeerd;
- [ ] secrets via Key Vault;
- [ ] persistente data getest na herstart;
- [ ] back-up en herstel getest;
- [ ] Application Insights en alerts actief;
- [ ] leverancierstest geslaagd;
- [ ] automatische sync nog gecontroleerd geactiveerd;
- [ ] protocolbeslissingen goedgekeurd;
- [ ] incidentcontacten gekend.
