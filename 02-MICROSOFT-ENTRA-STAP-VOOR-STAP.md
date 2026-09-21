# 02 — Microsoft Entra ID-login stap voor stap instellen

Deze handleiding maakt twee registraties in Microsoft Entra ID:

1. **EventRisk Kempen Web** — de browsertoepassing die de gebruiker ziet;
2. **EventRisk Kempen API** — de beveiligde server-API die tokens en rollen controleert.

Door de webapp en API te scheiden, kan de API controleren of het toegangstoken echt voor EventRisk Kempen bestemd is. Alleen gebruikers met een toegewezen EventRisk-app-rol worden toegelaten.

> Gebruik voor productie altijd de Microsoft-tenant van de verantwoordelijke organisatie. Voer dit uit met een Entra-beheerder of applicatiebeheerder.

---

## Deel A — Voorbereiding

### Stap 1 — Verzamel de basisgegevens

Noteer vooraf:

- de naam van de Microsoft-tenant;
- het primaire tenantdomein;
- wie Entra-appregistraties mag maken;
- de lokale URL: `http://localhost:3000`;
- de latere productie-URL, bijvoorbeeld `https://eventrisk.organisatie.be`;
- de namen of groepen voor D1, D2, D3, coördinatoren en beheerders.

### Stap 2 — Open het Microsoft Entra-beheercentrum

1. Meld aan met een beheerdersaccount.
2. Open **Microsoft Entra ID**.
3. Controleer rechtsboven dat u in de juiste tenant werkt.
4. Noteer onder **Overview** de **Tenant ID**.
5. Bewaar deze waarde tijdelijk in een veilig kladbestand; ze komt later in `.env`.

---

## Deel B — De API registreren

### Stap 3 — Maak de API-appregistratie

1. Ga naar **Microsoft Entra ID**.
2. Klik op **App registrations**.
3. Klik op **New registration**.
4. Vul bij **Name** in:

```text
EventRisk Kempen API
```

5. Kies bij **Supported account types**:

```text
Accounts in this organizational directory only
```

6. Laat **Redirect URI** leeg.
7. Klik op **Register**.

### Stap 4 — Noteer de API Client ID

1. Op de overzichtspagina staat **Application (client) ID**.
2. Kopieer deze waarde.
3. Noem deze in uw notities `API_CLIENT_ID`.
4. Controleer ook of **Directory (tenant) ID** overeenkomt met stap 2.

### Stap 5 — Stel de Application ID URI in

1. Klik links op **Expose an API**.
2. Klik naast **Application ID URI** op **Add**.
3. Laat het voorgestelde formaat staan:

```text
api://<API_CLIENT_ID>
```

4. Klik op **Save**.

### Stap 6 — Maak de API-scope

1. Blijf op **Expose an API**.
2. Klik op **Add a scope**.
3. Vul in:

| Veld | Waarde |
|---|---|
| Scope name | `EventRisk.Access` |
| Who can consent | `Admins only` |
| Admin consent display name | `EventRisk Kempen gebruiken` |
| Admin consent description | `Geeft de EventRisk Kempen-webapp toegang tot de beveiligde EventRisk API.` |
| State | `Enabled` |

4. Klik op **Add scope**.
5. De volledige scope wordt:

```text
api://<API_CLIENT_ID>/EventRisk.Access
```

6. Noteer deze volledige waarde als `API_SCOPE`.

---

## Deel C — App-rollen voor de hulpdiensten maken

Maak exact de onderstaande rollen. De code controleert de **Value**, niet alleen de zichtbare naam.

### Stap 7 — Open App roles

1. Open de registratie **EventRisk Kempen API**.
2. Klik links op **App roles**.
3. Klik op **Create app role**.

### Stap 8 — Maak de beheerdersrol

Vul in:

| Veld | Waarde |
|---|---|
| Display name | `EventRisk beheerder` |
| Allowed member types | `Users/Groups` |
| Value | `EventRisk.Admin` |
| Description | `Volledig technisch en functioneel beheer van EventRisk Kempen.` |
| Enable this app role | Aan |

Klik op **Apply**.

### Stap 9 — Maak de coördinatorrol

Herhaal met:

| Veld | Waarde |
|---|---|
| Display name | `EventRisk coördinator` |
| Value | `EventRisk.Coordinator` |
| Description | `Multidisciplinaire dossieropvolging en gedeelde wijzigingen.` |

### Stap 10 — Maak de rol D1

Herhaal met:

| Veld | Waarde |
|---|---|
| Display name | `EventRisk D1 Brandweer` |
| Value | `EventRisk.D1` |
| Description | `Toegang voor discipline 1 en recht om het D1-advies te bewerken.` |

### Stap 11 — Maak de rol D2

Herhaal met:

| Veld | Waarde |
|---|---|
| Display name | `EventRisk D2 Medische discipline` |
| Value | `EventRisk.D2` |
| Description | `Toegang voor discipline 2 en recht om het D2-advies te bewerken.` |

### Stap 12 — Maak de rol D3

Herhaal met:

| Veld | Waarde |
|---|---|
| Display name | `EventRisk D3 Politie` |
| Value | `EventRisk.D3` |
| Description | `Toegang voor discipline 3 en recht om het D3-advies te bewerken.` |

### Stap 13 — Controleer de rollen

De lijst moet exact deze waarden bevatten:

```text
EventRisk.Admin
EventRisk.Coordinator
EventRisk.D1
EventRisk.D2
EventRisk.D3
```

Er wordt bewust geen rol `Gemeente`, `Organisator` of `Burger` gemaakt.

---

## Deel D — De webapp registreren

### Stap 14 — Maak de SPA-appregistratie

1. Ga terug naar **App registrations**.
2. Klik op **New registration**.
3. Vul als naam in:

```text
EventRisk Kempen Web
```

4. Kies **Accounts in this organizational directory only**.
5. Kies bij **Redirect URI** het platform **Single-page application (SPA)**.
6. Vul voor lokaal testen in:

```text
http://localhost:3000
```

7. Klik op **Register**.

### Stap 15 — Noteer de SPA Client ID

1. Kopieer **Application (client) ID**.
2. Noem deze waarde in uw notities `SPA_CLIENT_ID`.

### Stap 16 — Controleer de redirect-URI

1. Klik op **Authentication**.
2. Onder **Single-page application** moet staan:

```text
http://localhost:3000
```

3. Voeg na ingebruikname ook de exacte productie-URL toe, bijvoorbeeld:

```text
https://eventrisk.organisatie.be
```

4. Gebruik geen wildcard zoals `https://*.organisatie.be`.
5. Zet **Allow public client flows** uit, tenzij een expliciete andere client dit vereist.
6. Sla de wijzigingen op.

---

## Deel E — De webapp toestemming geven tot de API

### Stap 17 — Voeg API permission toe

1. Open **EventRisk Kempen Web**.
2. Klik op **API permissions**.
3. Klik op **Add a permission**.
4. Klik op **My APIs**.
5. Kies **EventRisk Kempen API**.
6. Kies **Delegated permissions**.
7. Vink `EventRisk.Access` aan.
8. Klik op **Add permissions**.

### Stap 18 — Verleen admin consent

1. Klik op **Grant admin consent for ...**.
2. Bevestig.
3. Controleer dat de status groen is en **Granted for ...** vermeldt.

### Stap 19 — Voeg de webclient toe als geautoriseerde client

Deze stap voorkomt dat gebruikers bij normale aanmelding telkens afzonderlijk toestemming moeten geven.

1. Open opnieuw **EventRisk Kempen API**.
2. Ga naar **Expose an API**.
3. Onder **Authorized client applications** klikt u op **Add a client application**.
4. Vul de `SPA_CLIENT_ID` uit stap 15 in.
5. Vink `EventRisk.Access` aan.
6. Klik op **Add application**.

---

## Deel F — Gebruikers of groepen toegang geven

App-rollen worden toegewezen op de **Enterprise application** van de API.

### Stap 20 — Open de Enterprise application

1. Ga naar **Microsoft Entra ID**.
2. Klik op **Enterprise applications**.
3. Zoek `EventRisk Kempen API`.
4. Open de toepassing.

### Stap 21 — Verplicht expliciete toewijzing

1. Klik op **Properties**.
2. Zet **Assignment required?** op **Yes**.
3. Klik op **Save**.

Daardoor krijgt niet elke medewerker in de tenant automatisch toegang.

### Stap 22 — Wijs een testbeheerder toe

1. Klik op **Users and groups**.
2. Klik op **Add user/group**.
3. Kies één testgebruiker.
4. Kies de rol **EventRisk beheerder**.
5. Klik op **Assign**.

### Stap 23 — Wijs de hulpdienstrollen toe

Werk bij voorkeur met beveiligingsgroepen:

- `GRP-EventRisk-Admins` → `EventRisk.Admin`;
- `GRP-EventRisk-Coordinators` → `EventRisk.Coordinator`;
- `GRP-EventRisk-D1` → `EventRisk.D1`;
- `GRP-EventRisk-D2` → `EventRisk.D2`;
- `GRP-EventRisk-D3` → `EventRisk.D3`.

Voor elke groep:

1. Klik op **Add user/group**.
2. Selecteer de groep.
3. Selecteer exact één bijbehorende app-rol.
4. Klik op **Assign**.

### Stap 24 — Controleer dat gemeenten niet toegewezen zijn

1. Doorzoek de lijst **Users and groups**.
2. Verwijder eventuele algemene gemeente- of organisatiegroepen die geen hulpdienst zijn.
3. Controleer dat er geen standaardrol zonder discipline bestaat.
4. Documenteer wie roltoewijzingen mag beheren.

---

## Deel G — `.env` invullen

### Stap 25 — Open het lokale configuratiebestand

1. Open Visual Studio Code.
2. Open `.env`.
3. Vervang de waarden onder **AUTHENTICATIE**.

Voorbeeld:

```env
AUTH_MODE=entra
ENTRA_TENANT_ID=11111111-2222-3333-4444-555555555555
ENTRA_SPA_CLIENT_ID=aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee
ENTRA_API_CLIENT_ID=ffffffff-1111-2222-3333-444444444444
ENTRA_API_SCOPE=api://ffffffff-1111-2222-3333-444444444444/EventRisk.Access
ENTRA_ALLOWED_TENANT_ID=11111111-2222-3333-4444-555555555555
ENTRA_ALLOWED_ROLES=EventRisk.Admin,EventRisk.Coordinator,EventRisk.D1,EventRisk.D2,EventRisk.D3
```

4. Zet tijdelijk voor een echte logintest:

```env
AUTH_MODE=entra
```

5. Laat `NODE_ENV=development` staan zolang u lokaal test.
6. Sla op.

### Stap 26 — Start opnieuw

Stop de server met `Ctrl + C` en start opnieuw:

```powershell
npm run dev
```

### Stap 27 — Test de Microsoft-login

1. Open een privé-/InPrivate-browservenster.
2. Ga naar `http://localhost:3000`.
3. Klik op **Aanmelden met Microsoft**.
4. Meld aan met de toegewezen testgebruiker.
5. Controleer rechtsboven de naam en rol.
6. Open **Mijn account** of het gebruikersmenu.
7. Controleer dat de rol overeenkomt met de Entra-toewijzing.

---

## Deel H — Rechten functioneel testen

### Stap 28 — Test D1

1. Wijs een gebruiker alleen `EventRisk.D1` toe.
2. Meld aan als die gebruiker.
3. Open een dossier.
4. Bewerk het D1-advies.
5. Controleer dat D2- en D3-adviesvelden alleen-lezen zijn.
6. Controleer dat **Integraties beheren** niet beschikbaar is.

### Stap 29 — Test D2 en D3

Herhaal voor `EventRisk.D2` en `EventRisk.D3`.

### Stap 30 — Test coördinator

1. Wijs `EventRisk.Coordinator` toe.
2. Controleer dat gedeelde dossiergegevens kunnen worden aangepast.
3. Controleer dat technische instellingen en gebruikersbeheer niet onbeperkt toegankelijk zijn.

### Stap 31 — Test beheerder

1. Wijs `EventRisk.Admin` toe.
2. Controleer toegang tot integraties, synchronisatielogs en auditlog.
3. Controleer dat uitgaande synchronisatie kan worden gestart.

### Stap 32 — Test een gebruiker zonder rol

1. Gebruik een tenantgebruiker zonder EventRisk-toewijzing.
2. Probeer aan te melden.
3. De server moet de toegang weigeren met de melding dat geen EventRisk-rol aanwezig is.

---

## Deel I — Productie-instellingen

### Stap 33 — Voeg de productie-redirect toe

1. Open **EventRisk Kempen Web**.
2. Ga naar **Authentication**.
3. Voeg de definitieve HTTPS-URL toe.
4. Controleer hoofdletters, pad en afsluitende slash exact.
5. Verwijder ongebruikte test-URI's zodra de testfase voorbij is.

### Stap 34 — Zet de productieomgeving vast

In de productieconfiguratie:

```env
NODE_ENV=production
AUTH_MODE=entra
APP_BASE_URL=https://eventrisk.organisatie.be
```

De server weigert in productie bewust te starten wanneer `AUTH_MODE=development` is.

### Stap 35 — Maak Conditional Access-afspraken

Laat de Entra-beheerder minstens beoordelen:

- meervoudige verificatie;
- blokkeren van verouderde authenticatie;
- alleen beheerde of conforme toestellen voor gevoelige rollen;
- geografische of risicogebaseerde beperkingen;
- periodieke toegangsreviews;
- noodaccounts en herstelprocedure.

### Stap 36 — Plan periodieke toegangscontrole

Minstens elk kwartaal:

1. exporteer de toegewezen gebruikers en groepen;
2. laat D1, D2 en D3 hun leden bevestigen;
3. verwijder vertrokken of gewijzigde medewerkers;
4. controleer beheerders afzonderlijk;
5. bewaar het goedkeuringsverslag volgens het interne informatiebeheerbeleid.

---

## Veelvoorkomende fouten

### Fout: `AADSTS50011` of redirect URI mismatch

De URL in de browser komt niet exact overeen met de SPA-redirect-URI. Controleer protocol (`http`/`https`), domein, poort, pad en afsluitende slash.

### Fout: de gebruiker kan aanmelden maar de API geeft 401

Controleer:

1. `ENTRA_API_CLIENT_ID`;
2. `ENTRA_API_SCOPE`;
3. of de webapp toestemming heeft voor `EventRisk.Access`;
4. of admin consent gegeven is;
5. of de API het juiste `aud`-veld in het token verwacht.

### Fout: de API geeft “geen EventRisk-rol”

Controleer of de rol is toegewezen op **Enterprise applications → EventRisk Kempen API → Users and groups**. Alleen een groep maken is niet voldoende; die groep moet ook aan de app-rol gekoppeld zijn.

### Fout: rolwijziging is niet onmiddellijk zichtbaar

1. Meld volledig af.
2. Sluit alle browservensters.
3. Open InPrivate.
4. Meld opnieuw aan zodat een nieuw token wordt opgehaald.

### Fout: gemeenten krijgen toch toegang

Controleer:

- `Assignment required? = Yes`;
- de toegewezen gebruikers en groepen;
- dat geen brede organisatiegroep een EventRisk-rol kreeg;
- dat `ENTRA_ALLOWED_ROLES` alleen de vijf bedoelde waarden bevat.
