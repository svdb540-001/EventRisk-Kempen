# 01 — EventRisk Kempen stap voor stap in GitHub zetten

Deze handleiding vertrekt van een Windows-computer. De commando's voor macOS en Linux zijn bijna identiek.

---

## Deel A — Programma's installeren

### Stap 1 — Controleer of Node.js al geïnstalleerd is

1. Klik op de Windows-startknop.
2. Typ `PowerShell`.
3. Open **Windows PowerShell**.
4. Typ:

```powershell
node --version
```

5. Druk op Enter.
6. Verschijnt een versie die begint met `v24` of hoger, dan is Node.js goed.
7. Verschijnt een foutmelding, installeer dan Node.js 24 LTS via de officiële Node.js-website.
8. Sluit na de installatie PowerShell volledig.
9. Open PowerShell opnieuw.
10. Voer opnieuw `node --version` uit.

### Stap 2 — Controleer npm

Typ:

```powershell
npm --version
```

Er moet een versienummer verschijnen.

### Stap 3 — Installeer Git

1. Download Git voor Windows via de officiële Git-website.
2. Start de installatie.
3. Laat de standaardkeuzes staan.
4. Kies bij de editor eventueel **Visual Studio Code** als u die gebruikt.
5. Rond de installatie af.
6. Open een nieuwe PowerShell.
7. Typ:

```powershell
git --version
```

Er moet een versienummer verschijnen.

### Stap 4 — Installeer Visual Studio Code

1. Download Visual Studio Code via de officiële Microsoft-website.
2. Start de installatie.
3. Vink aan:
   - **Add “Open with Code” action**;
   - **Add to PATH**;
   - **Register Code as an editor**.
4. Rond de installatie af.

---

## Deel B — De projectmap openen

### Stap 5 — Pak het ZIP-bestand uit

1. Download `EventRisk-Kempen-Uitrolbaar.zip`.
2. Ga in Verkenner naar **Downloads**.
3. Klik met de rechtermuisknop op het ZIP-bestand.
4. Kies **Alles uitpakken**.
5. Kies bijvoorbeeld:

```text
C:\Projecten\EventRisk-Kempen
```

6. Klik op **Uitpakken**.

### Stap 6 — Open de juiste map in Visual Studio Code

1. Open Visual Studio Code.
2. Klik op **File**.
3. Klik op **Open Folder**.
4. Kies de map `EventRisk-Kempen`.
5. Controleer links in de Verkenner of u onder andere ziet:
   - `server.mjs`
   - `package.json`
   - `public`
   - `src`
   - `docs`

Ziet u eerst nog een tweede map met dezelfde naam, open dan die binnenste map. `package.json` moet rechtstreeks zichtbaar zijn.

---

## Deel C — De app lokaal testen vóór GitHub

### Stap 7 — Open de terminal in Visual Studio Code

1. Klik bovenaan op **Terminal**.
2. Klik op **New Terminal**.
3. Onderaan verschijnt PowerShell.
4. Controleer of het pad eindigt op `EventRisk-Kempen`.

### Stap 8 — Maak `.env`

Voer uit:

```powershell
Copy-Item .env.example .env
```

Controleer links of `.env` verschijnt.

### Stap 9 — Controleer de lokale testinstellingen

1. Open `.env`.
2. Zoek:

```env
AUTH_MODE=development
```

3. Zoek ook:

```env
MOCK_CONNECTORS=true
```

4. Laat deze waarden voorlopig zo staan.
5. Sla op met `Ctrl + S`.

### Stap 10 — Start de app

Voer uit:

```powershell
npm run dev
```

U moet ongeveer dit zien:

```text
EventRisk Kempen luistert op http://localhost:3000
Authenticatiemodus: development
Connectormodus: mock
```

### Stap 11 — Open de app

1. Open Microsoft Edge, Chrome of Firefox.
2. Ga naar:

```text
http://localhost:3000
```

3. Kies als testrol **Zonaal beheerder**.
4. Klik op **Open lokale testomgeving**.

### Stap 12 — Test de mockkoppelingen

1. Klik links op **Integraties**.
2. Klik bij Eaglebe op **Importeer nu**.
3. Klik bij Flowlab op **Importeer nu**.
4. Klik links op **Evenementendossiers**.
5. Controleer of twee dossiers zichtbaar zijn.
6. Open een dossier.
7. Controleer het berekende RN.
8. Vul een advies in.
9. Bewaar het advies.
10. Ga terug naar **Integraties**.
11. Controleer of het dossier in de terugkoppelwachtrij staat.
12. Klik op **Verstuur**.

### Stap 13 — Stop de app

1. Klik in de terminal.
2. Druk `Ctrl + C`.
3. Bevestig eventueel met `J` of `Y`.

---

## Deel D — GitHub-account en repository maken

### Stap 14 — Maak of open uw GitHub-account

1. Ga naar GitHub.
2. Meld aan.
3. Gebruik bij voorkeur een organisatieaccount van Brandweer Zone Kempen en geen persoonlijk account voor de uiteindelijke productiecode.
4. Schakel tweestapsverificatie in.

### Stap 15 — Maak een nieuwe repository

1. Klik rechtsboven op het plusteken `+`.
2. Klik op **New repository**.
3. Kies bij **Owner** de juiste organisatie.
4. Vul bij **Repository name** in:

```text
eventrisk-kempen
```

5. Vul bij **Description** in:

```text
Beveiligd evenementenrisicoportaal voor de hulpdiensten van de zone Kempen.
```

6. Kies **Private**.
7. Vink **Add a README file** niet aan, want de projectmap bevat al een README.
8. Voeg geen `.gitignore` toe, want die bestaat al.
9. Voeg geen licentie toe zonder interne beslissing.
10. Klik op **Create repository**.

### Stap 16 — Kopieer het repositoryadres

Op de lege repositorypagina ziet u een adres dat eindigt op `.git`, bijvoorbeeld:

```text
https://github.com/NAAM-ORGANISATIE/eventrisk-kempen.git
```

Kopieer dit adres.

---

#
## Belangrijk — GitHub Pages niet gebruiken

GitHub Pages kan alleen de statische interface publiceren en draait `server.mjs` niet. Zet onder **Settings → Pages** geen productiepublicatie op basis van de map `public`. De officiële toepassing wordt vanuit GitHub Actions naar Azure App Service uitgerold.

Wanneer u een Pages-link opent, kan `/api/public-config` HTML teruggeven in plaats van JSON. De app toont dan een melding dat de Azure-URL nodig is. Deel daarom uitsluitend de Azure App Service-URL of het latere eigen domein met gebruikers.

---

# Deel E — De bestanden voor het eerst uploaden

### Stap 17 — Initialiseer Git lokaal

Open de terminal in Visual Studio Code en voer uit:

```powershell
git init
```

### Stap 18 — Stel uw naam en e-mailadres in

Doe dit alleen als Git erom vraagt:

```powershell
git config --global user.name "Uw Voornaam Achternaam"
git config --global user.email "uw.werkmail@organisatie.be"
```

Gebruik bij voorkeur uw professionele e-mailadres.

### Stap 19 — Controleer welke bestanden worden toegevoegd

Voer uit:

```powershell
git status
```

Belangrijk:

- `.env` mag **niet** in de lijst staan;
- `.env.example` mag wel in de lijst staan;
- databasebestanden in `data` mogen niet meegaan.

Staat `.env` toch in de lijst, stop dan en controleer `.gitignore`.

### Stap 20 — Voeg de bestanden toe

```powershell
git add .
```

### Stap 21 — Controleer opnieuw

```powershell
git status
```

Controleer nogmaals dat `.env` niet vermeld wordt onder **Changes to be committed**.

### Stap 22 — Maak de eerste commit

```powershell
git commit -m "Eerste versie EventRisk Kempen"
```

### Stap 23 — Noem de hoofdbranch `main`

```powershell
git branch -M main
```

### Stap 24 — Koppel de lokale map aan GitHub

Vervang het voorbeeldadres door het adres uit stap 16:

```powershell
git remote add origin https://github.com/NAAM-ORGANISATIE/eventrisk-kempen.git
```

### Stap 25 — Controleer de koppeling

```powershell
git remote -v
```

Het juiste GitHub-adres moet tweemaal verschijnen.

### Stap 26 — Upload de code

```powershell
git push -u origin main
```

Mogelijk opent een browservenster om bij GitHub aan te melden. Rond die aanmelding af.

### Stap 27 — Controleer GitHub

1. Open de repository in de browser.
2. Vernieuw de pagina.
3. Controleer of de mappen `public`, `src`, `config` en `docs` zichtbaar zijn.
4. Open **Actions**.
5. Controleer of de workflow **EventRisk CI** gestart is.
6. Wacht tot het groene vinkje verschijnt.

---

## Deel F — Een wijziging veilig uitvoeren

Werk nooit rechtstreeks op `main` voor grotere wijzigingen.

### Stap 28 — Haal de nieuwste versie op

```powershell
git switch main
git pull
```

### Stap 29 — Maak een nieuwe branch

Voorbeeld:

```powershell
git switch -c feature/adviesrapport-pdf
```

Gebruik korte namen zonder spaties.

### Stap 30 — Voer de wijziging uit

1. Pas de bestanden aan.
2. Start de app lokaal.
3. Test de wijziging.
4. Voer uit:

```powershell
npm test
npm run check
```

### Stap 31 — Bekijk de wijzigingen

```powershell
git status
git diff
```

### Stap 32 — Commit de wijziging

```powershell
git add .
git commit -m "Voeg adviesrapport toe"
```

### Stap 33 — Push de branch

```powershell
git push -u origin feature/adviesrapport-pdf
```

### Stap 34 — Maak een Pull Request

1. Open GitHub.
2. GitHub toont meestal **Compare & pull request**.
3. Klik daarop.
4. Beschrijf:
   - wat gewijzigd is;
   - waarom;
   - hoe getest is;
   - mogelijke risico's.
5. Vraag minstens één collega om controle.
6. Voeg nooit secrets toe aan screenshots of beschrijvingen.
7. Merge pas nadat GitHub Actions groen is.

---

## Deel G — Repository beveiligen

### Stap 35 — Bescherm `main`

1. Open de repository.
2. Klik op **Settings**.
3. Klik op **Branches** of **Rules**.
4. Maak een branch protection rule/ruleset voor `main`.
5. Schakel minstens in:
   - pull request verplicht;
   - minstens één goedkeuring;
   - status checks verplicht;
   - branch moet up-to-date zijn;
   - force push verbieden;
   - branch verwijderen verbieden.

### Stap 36 — Beperk toegang

1. Open **Settings**.
2. Open **Collaborators and teams**.
3. Geef alleen noodzakelijke rechten.
4. Gebruik teams, bijvoorbeeld:
   - `EventRisk Developers` — Write;
   - `EventRisk Reviewers` — Maintain;
   - `EventRisk Owners` — Admin.
5. Geef gemeenten geen toegang tot de broncode tenzij dit bestuurlijk expliciet is afgesproken.

### Stap 37 — Activeer beveiligingsfuncties

Onder **Settings → Security**:

1. Activeer secret scanning.
2. Activeer push protection.
3. Activeer Dependabot alerts wanneer later npm-afhankelijkheden bijkomen.
4. Activeer code scanning indien beschikbaar.

---

## Deel H — Veelvoorkomende fouten

### Fout: `node is not recognized`

Node.js is niet geïnstalleerd of PowerShell was nog open tijdens de installatie. Sluit alle terminals en open een nieuwe.

### Fout: poort 3000 is al in gebruik

Open `.env` en wijzig:

```env
PORT=3001
APP_BASE_URL=http://localhost:3001
```

Start opnieuw en open `http://localhost:3001`.

### Fout: `.env` staat in GitHub

1. Verwijder onmiddellijk eventuele echte secrets in Microsoft/Eaglebe/Flowlab.
2. Maak nieuwe secrets aan.
3. Voer lokaal uit:

```powershell
git rm --cached .env
git commit -m "Verwijder lokaal configuratiebestand"
git push
```

Alleen verwijderen uit de laatste commit is onvoldoende wanneer er al echte secrets in de geschiedenis stonden. Laat dan de Git-geschiedenis professioneel opschonen.

### Fout: Git vraagt telkens een wachtwoord

Gebruik de browseraanmelding van Git Credential Manager of SSH. Gewone GitHub-wachtwoorden werken niet meer voor Git-acties.
