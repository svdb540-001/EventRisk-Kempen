# 00 — Start hier: EventRisk Kempen effectief uitrollen

Deze handleiding legt uit welke bestanden u hebt, waarom de GitHub Pages-versie de JSON-fout geeft en in welke exacte volgorde u de toepassing werkend online zet.

---

## 1. De fout op het screenshot

Op het scherm staat een fout in de aard van:

```text
Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

De interface voert bij het openen deze aanvraag uit:

```text
GET /api/public-config
```

Een werkende EventRisk-server antwoordt met JSON, bijvoorbeeld:

```json
{
  "appName": "EventRisk Kempen",
  "authMode": "entra"
}
```

GitHub Pages draait geen Node.js-server. Het geeft op die API-URL een HTML-pagina of foutpagina terug die begint met:

```html
<!DOCTYPE html>
```

De browser probeert die HTML als JSON te lezen en toont de fout.

### Oplossing

- GitHub blijft de broncode bewaren.
- GitHub Actions rolt de code uit.
- Azure App Service draait de Node.js-server.
- Gebruikers openen uitsluitend de Azure-URL of het latere eigen domein.
- GitHub Pages wordt niet gebruikt als productiehosting.

De interface bevat nu ook een herkenbare melding wanneer iemand toch de statische versie opent.

---

## 2. Wat wordt in Azure geplaatst?

De meegeleverde Bicep-template maakt:

1. een Linux App Service Plan;
2. een Node.js 24 Web App;
3. een PostgreSQL Flexible Server;
4. de database `eventrisk`;
5. een Azure Storage-account;
6. een private Blob-container `eventrisk-documents`;
7. een Azure Key Vault;
8. een Key Vault-secret voor het databasewachtwoord;
9. een managed identity voor de Web App;
10. rechten waarmee de Web App documenten in Blob Storage kan lezen en schrijven;
11. rechten waarmee de Web App het databasesecret kan lezen;
12. alle niet-geheime EventRisk-instellingen.

Daarna rolt GitHub Actions de broncode uit naar de Web App.

---

## 3. Wat moet vooraf beschikbaar zijn?

Zorg dat de volgende personen of teams betrokken zijn:

- Microsoft 365/Entra-beheerder;
- Azure-abonnementsbeheerder;
- GitHub repositorybeheerder;
- privacy- en informatieveiligheidsverantwoordelijke;
- functionele eigenaar van EventRisk Kempen;
- technische contactpersoon Eaglebe;
- technische contactpersoon Flowlab;
- vertegenwoordigers van D1, D2 en D3 voor acceptatietesten.

U hebt nodig:

- een Azure-abonnement;
- rechten om een resource group, App Service, PostgreSQL, Storage, Key Vault en roltoewijzingen te maken;
- een GitHub-account;
- een private GitHub-repository;
- toegang tot Microsoft Entra ID;
- Node.js 24 voor lokale tests;
- Git;
- Azure CLI voor de eenvoudigste Bicep-uitrol.

---

## 4. De volledige volgorde

Voer de stappen exact in deze volgorde uit.

### Fase A — lokaal controleren

1. Pak het ZIP-bestand uit.
2. Open de map in Visual Studio Code.
3. Open **Terminal → New Terminal**.
4. Voer uit:

```powershell
Copy-Item .env.example .env
npm install
npm run check
npm test
npm run dev
```

5. Open `http://localhost:3000`.
6. Kies **Zonaal beheerder**.
7. Controleer Dashboard, Dossiers, Kalender, Protocol en Integraties.
8. Stop de server met `Ctrl+C`.

### Fase B — Microsoft-login voorbereiden

1. Maak de API-appregistratie.
2. Maak de scope `EventRisk.Access`.
3. Maak de vijf EventRisk App Roles.
4. Maak de SPA-appregistratie.
5. Geef de SPA-app toestemming voor de API-scope.
6. Wijs uitsluitend hulpdienstmedewerkers of hulpdienstgroepen toe.
7. Noteer tenant-id, SPA client-id en API client-id.

Volg hiervoor `02-MICROSOFT-ENTRA-STAP-VOOR-STAP.md`.

### Fase C — GitHub-repository maken

1. Maak een private repository.
2. Upload de volledige projectmap, niet alleen `public`.
3. Controleer dat `.env` niet in GitHub staat.
4. Controleer dat GitHub Pages niet als productieroute wordt gebruikt.
5. Controleer de eerste CI-run.

Volg hiervoor `01-GITHUB-STAP-VOOR-STAP.md`.

### Fase D — Azure-infrastructuur maken

1. Installeer of open Azure Cloud Shell.
2. Maak een resource group.
3. Kopieer het parametersjabloon.
4. Vul de vier Microsoftwaarden in.
5. Rol `infra/main.bicep` uit.
6. Noteer de Web App-naam en URL.
7. Voeg de echte Web App-URL toe als SPA redirect URI.
8. Herstart de Web App.

Volg hiervoor `09-AZURE-UITROL-V2-STAP-VOOR-STAP.md`.

### Fase E — GitHub naar Azure laten uitrollen

1. Maak een Entra-appregistratie voor GitHub Deployment.
2. Voeg een federated credential voor de GitHub-repository toe.
3. Geef deze identiteit Website Contributor-recht op de resource group of Web App.
4. Voeg drie GitHub secrets toe.
5. Voeg twee GitHub variables toe.
6. Start de workflow **EventRisk naar Azure**.
7. Controleer de healthcheck.

### Fase F — rollen testen

Test met minstens vijf testgebruikers of testgroepen:

- Admin;
- Coordinator;
- D1;
- D2;
- D3.

Controleer dat:

- D1 geen D2-advies kan wijzigen;
- D2 geen D3-advies kan wijzigen;
- D3 geen integratie-instellingen ziet;
- alleen Admin integraties en auditlog beheert;
- er geen gemeentelijke of organisatorrol bestaat.

### Fase G — Eaglebe en Flowlab

1. Vraag sandboxcredentials aan.
2. Laat de mapping schriftelijk bevestigen.
3. Activeer één connector tegelijk.
4. Start met alleen import.
5. Controleer dubbele dossiers en datumvelden.
6. Activeer pas daarna terugkoppeling.
7. Activeer automatische synchronisatie pas na acceptatie.

### Fase H — go-live

Gebruik `10-GO-LIVE-CHECKLIST.md` en laat elke verantwoordelijke aftekenen.

---

## 5. Welke URL gebruikt iedereen?

Niet gebruiken:

```text
https://<organisatie>.github.io/<repository>/
```

Wel gebruiken:

```text
https://<azure-web-app>.azurewebsites.net
```

Later kan een eigen domein worden gekoppeld, bijvoorbeeld:

```text
https://eventrisk.hulpverleningkempen.be
```

Voeg een eigen domein pas toe nadat:

- de Azure-versie stabiel werkt;
- het TLS-certificaat actief is;
- de nieuwe domein-URL als Microsoft SPA redirect URI is toegevoegd;
- `APP_BASE_URL` naar het eigen domein is aangepast.

---

## 6. Wanneer is de toepassing technisch uitgerold?

De technische uitrol is geslaagd wanneer:

1. `/api/health` JSON met `"ok": true` toont;
2. de loginpagina zonder fout verschijnt;
3. Microsoft-login opent;
4. een toegewezen testgebruiker binnenkomt;
5. een niet-toegewezen Microsoft-gebruiker wordt geweigerd;
6. dossiers na een herstart blijven bestaan;
7. een document na een herstart opnieuw downloadbaar is;
8. de auditlog acties registreert;
9. GitHub Actions groen eindigt;
10. de GitHub Pages-URL niet aan eindgebruikers wordt verspreid.

---

## 7. Wanneer is de toepassing functioneel klaar voor productie?

Naast de technische uitrol moeten nog worden goedgekeurd:

- protocolmatrix en afrondingsregel;
- minimale maatregelen per RN;
- documentvereisten;
- verantwoordelijkheden D1/D2/D3;
- bewaartermijnen;
- privacy- en verwerkersafspraken;
- incident- en herstelprocedure;
- definitieve Eaglebe- en Flowlab-mapping;
- acceptatieverslag;
- eigenaar voor gebruikersbeheer;
- eigenaar voor operationeel beheer.

Een succesvolle Azure-deployment alleen is dus nog geen formele go-livegoedkeuring.
