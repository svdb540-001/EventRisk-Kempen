# 03 — Eaglebe- en Flowlab-koppeling stap voor stap

EventRisk Kempen gebruikt een connectorlaag. Elk gemeentelijk platform wordt eerst naar één intern EventRisk-formaat vertaald. Daarna kunnen D1-, D2- en D3-resultaten via dezelfde connector worden teruggestuurd.

De meegeleverde connectoren werken onmiddellijk in **mockmodus**. Livegebruik vereist officiële endpoints, credentials, veldnamen en schrijfrechten van Eaglebe, Flowlab en de deelnemende gemeenten.

---

## Deel A — Eerst bestuurlijke en technische afspraken maken

### Stap 1 — Maak een integratie-eigenaar aan beide kanten

Duid per partij minstens één contact aan:

- EventRisk Kempen technisch eigenaar;
- EventRisk Kempen functioneel eigenaar;
- Eaglebe/Merkator contact;
- Flowlab/Pixeo contact;
- contact per aangesloten gemeente;
- informatiebeveiliging/DPO;
- testcoördinator.

### Stap 2 — Leg vast welke dossiers worden doorgestuurd

Beantwoord schriftelijk:

1. Alleen ingediende aanvragen of ook concepten?
2. Alleen evenementen waarvoor advies gevraagd wordt of alle evenementen?
3. Welke gemeenten nemen deel?
4. Welke statussen worden geïmporteerd?
5. Worden verwijderingen doorgegeven?
6. Hoe worden geannuleerde evenementen verwerkt?
7. Hoe snel moet een wijziging zichtbaar zijn?

Aanbevolen start:

- alleen formeel ingediende evenementaanvragen;
- alleen geselecteerde pilootgemeenten;
- wijzigingen ophalen om de 15 minuten;
- geannuleerde dossiers niet wissen maar als geannuleerd markeren;
- elke import en export auditeren.

### Stap 3 — Leg vast wat EventRisk mag terugsturen

Maak per leverancier een tabel met minimaal:

- algemeen RN;
- D1-score en D1-RN;
- D2-score en D2-RN;
- D3-score en D3-RN;
- multidisciplinaire maatregelen;
- sneladviezen;
- D1-advies en status;
- D2-advies en status;
- D3-advies en status;
- datum laatste beoordeling;
- EventRisk-referentie;
- link of rapportreferentie;
- dossierstatus;
- fout- of blokkademelding.

Laat de leverancier voor ieder veld bevestigen of het:

- leesbaar is;
- schrijfbaar is;
- overschreven mag worden;
- een maximale lengte heeft;
- HTML, platte tekst, keuzewaarde of bestand verwacht.

### Stap 4 — Bepaal de bronhouder per veld

Gebruik één eigenaar per gegeven. Voorbeeld:

| Gegeven | Bronhouder |
|---|---|
| Naam evenement | Gemeentelijk loket |
| Organisator | Gemeentelijk loket |
| Datum en locatie | Gemeentelijk loket |
| Antwoorden gemeentelijk formulier | Gemeentelijk loket |
| RN-berekening | EventRisk Kempen |
| D1-advies | EventRisk Kempen / D1 |
| D2-advies | EventRisk Kempen / D2 |
| D3-advies | EventRisk Kempen / D3 |
| Vergunningsbeslissing | Gemeente |

EventRisk mag brongegevens niet stilzwijgend terug overschrijven tenzij dit expliciet is afgesproken.

---

## Deel B — Mockmodus testen

### Stap 5 — Controleer `.env`

Zet voor lokaal testen:

```env
MOCK_CONNECTORS=true
EAGLEBE_ENABLED=false
FLOWLAB_ENABLED=false
```

### Stap 6 — Start de app

```powershell
npm run dev
```

### Stap 7 — Importeer Eaglebe-mockdata

1. Meld lokaal aan als beheerder.
2. Open **Integraties**.
3. Open de kaart **Eaglebe**.
4. Klik op **Importeer nu**.
5. Controleer de succesmelding.
6. Open **Evenementendossiers**.
7. Controleer de bronbadge **Eaglebe**.

De testdata staat in:

```text
fixtures/eaglebe-events.json
```

### Stap 8 — Importeer Flowlab-mockdata

Herhaal met **Flowlab**. De testdata staat in:

```text
fixtures/flowlab-events.json
```

### Stap 9 — Test terugkoppeling

1. Open een geïmporteerd dossier.
2. Vul het advies van uw testdiscipline in.
3. Klik op **Advies bewaren**.
4. Open **Integraties**.
5. Controleer de terugkoppelwachtrij.
6. Klik op **Verstuur**.
7. Open **Synchronisatielog**.
8. Controleer richting, platform, externe ID, status en tijdstip.

In mockmodus wordt niets naar een externe leverancier gestuurd; de volledige interne flow wordt wel getest.

---

## Deel C — De veldmapping aanpassen

### Stap 10 — Open de mappingbestanden

De bestanden staan hier:

```text
config/mappings/eaglebe.json
config/mappings/flowlab.json
```

Elk bestand bevat:

- `inbound`: extern veld → EventRisk-veld;
- `outbound`: EventRisk-resultaat → extern veld;
- eventuele statustransformaties.

### Stap 11 — Vergelijk met een echte payload

Vraag van elke leverancier minstens:

1. één volledig testdossier als JSON;
2. één minimaal dossier;
3. één dossier met meerdere locaties/dagen;
4. één dossier met documenten;
5. één geannuleerd dossier;
6. een voorbeeld van het verwachte terugkoppelverzoek;
7. foutresponsen met statuscodes.

Verwijder of anonimiseer persoonsgegevens voordat testpayloads in GitHub worden geplaatst.

### Stap 12 — Pas alleen de mapping aan waar mogelijk

Voorbeeldconcept:

```json
{
  "external.eventName": "event.name",
  "external.municipality": "event.municipality",
  "external.startDate": "event.startAt"
}
```

Na elke wijziging:

```powershell
npm test
npm run check
```

Maak daarna een aparte Git-branch en Pull Request.

---

## Deel D — Eaglebe live configureren

### Stap 13 — Vraag Eaglebe API-toegang

Vraag schriftelijk:

- test- en productie-basis-URL;
- token-URL;
- client ID;
- client secret;
- eventuele scope/audience;
- events-endpoint;
- endpoint voor één dossier;
- endpoint voor advies/feedback;
- ondersteunde HTTP-methode;
- filter voor `changed since`;
- paginering;
- rate limits;
- webhookmogelijkheden;
- documentdownload;
- IP-allowlisting;
- verval- en rotatiebeleid van secrets.

### Stap 14 — Vul Eaglebe in `.env`

Voorbeeld, met uitsluitend door Eaglebe bevestigde waarden:

```env
MOCK_CONNECTORS=false
EAGLEBE_ENABLED=true
EAGLEBE_BASE_URL=https://door-leverancier-bevestigde-host
EAGLEBE_TOKEN_URL=https://door-leverancier-bevestigde-token-url
EAGLEBE_CLIENT_ID=...
EAGLEBE_CLIENT_SECRET=...
EAGLEBE_SCOPE=...
EAGLEBE_EVENTS_PATH=/bevestigd-pad
EAGLEBE_EVENT_PATH_TEMPLATE=/bevestigd-pad/{externalId}
EAGLEBE_FEEDBACK_PATH_TEMPLATE=/bevestigd-pad/{externalId}/advies
EAGLEBE_CHANGED_SINCE_PARAM=changedSince
EAGLEBE_FEEDBACK_METHOD=POST
```

Zet echte secrets nooit in `.env.example`, GitHub of een ticket.

### Stap 15 — Bewaar het secret veilig

Lokaal mag `.env` tijdelijk gebruikt worden. In productie:

- gebruik Azure Key Vault of een gelijkwaardige secret store;
- geef alleen de runtime-identiteit leestoegang;
- log het secret nooit;
- plan rotatie;
- trek het secret onmiddellijk in bij vermoed lek.

### Stap 16 — Test eerst alleen lezen

1. Zet uitgaande synchronisatie procesmatig nog uit.
2. Start de app in de testomgeving.
3. Importeer één testgemeente.
4. Vergelijk elk veld met het Eaglebe-brondossier.
5. Controleer tijdzones, tekencodering en datumnotatie.
6. Controleer dat dezelfde externe ID niet tot dubbels leidt.
7. Wijzig het bronrecord en importeer opnieuw.
8. Controleer dat het bestaande EventRisk-dossier wordt bijgewerkt.

### Stap 17 — Test daarna één gecontroleerde terugkoppeling

1. Gebruik een speciaal leveranciers-testdossier.
2. Bereken RN en voeg testadviezen toe.
3. Bekijk eerst de payload-preview.
4. Laat leverancier/gemeente bevestigen dat de payload correct is.
5. Verstuur één keer.
6. Controleer de HTTP-status.
7. Controleer het ontvangende dossier handmatig.
8. Herhaal niet automatisch bij een onbekende fout; onderzoek eerst.

### Stap 18 — Activeer automatische synchronisatie

Pas na acceptatie:

```env
SYNC_AUTOMATIC=true
SYNC_INTERVAL_MINUTES=15
```

Begin met een ruime interval. Verlaag alleen na overleg over rate limits en belasting.

---

## Deel E — Flowlab live configureren

### Stap 19 — Vraag de exacte Flowlab-specificatie

Vraag Flowlab/Pixeo en de betrokken gemeenten:

- bestaat één centrale API of een instantie per gemeente?
- basis-URL per omgeving;
- API-key, OAuth2 of een andere methode;
- naam van de authenticatieheader;
- events-endpoint;
- statusfilter;
- changed-sincefilter;
- paginering;
- bijlageninterface;
- terugkoppelendpoint;
- schrijfbare velden;
- webhookformaat en handtekening;
- idempotency-mogelijkheid;
- foutcodes en retrybeleid.

### Stap 20 — Vul Flowlab in `.env`

Voorbeeld:

```env
MOCK_CONNECTORS=false
FLOWLAB_ENABLED=true
FLOWLAB_BASE_URL=https://door-flowlab-bevestigde-host
FLOWLAB_API_KEY=...
FLOWLAB_AUTH_HEADER=X-Api-Key
FLOWLAB_EVENTS_PATH=/bevestigd-pad
FLOWLAB_EVENT_PATH_TEMPLATE=/bevestigd-pad/{externalId}
FLOWLAB_FEEDBACK_PATH_TEMPLATE=/bevestigd-pad/{externalId}/advies
FLOWLAB_CHANGED_SINCE_PARAM=changedSince
FLOWLAB_FEEDBACK_METHOD=POST
FLOWLAB_WEBHOOK_SECRET=...
```

Pas `FLOWLAB_AUTH_HEADER` alleen aan volgens de documentatie van de leverancier.

### Stap 21 — Test de Flowlab-import

Gebruik dezelfde controles als bij Eaglebe:

- externe ID;
- gemeente;
- organisator;
- datums/tijdzone;
- locatie;
- verwachte bezoekers;
- formulierantwoorden;
- documenten;
- wijzigingen;
- annulatie;
- dubbele levering.

### Stap 22 — Test de Flowlab-terugkoppeling

1. Verstuur alleen naar de testomgeving.
2. Gebruik één veld per testfase.
3. Voeg daarna RN en disciplinescores toe.
4. Voeg vervolgens adviesvelden toe.
5. Voeg pas als laatste bestanden of rapportreferenties toe.
6. Laat de gemeente het resultaat in haar loket controleren.

---

## Deel F — Webhooks beveiligen

### Stap 23 — Gebruik altijd HTTPS

Een webhook-URL moet in productie HTTPS gebruiken. Accepteer geen gevoelige gegevens via onbeveiligde HTTP.

### Stap 24 — Gebruik een webhooksecret

1. Genereer een lang willekeurig secret.
2. Bewaar het in de secret store.
3. Laat de leverancier een HMAC-handtekening of gelijkwaardig mechanisme meesturen.
4. Vergelijk de handtekening vóór de payload verwerkt wordt.
5. Weiger ongeldige verzoeken met 401 of 403.

### Stap 25 — Bescherm tegen herhaling

Laat waar mogelijk meesturen:

- bericht-ID;
- timestamp;
- nonce;
- broninstantie.

Bewaar verwerkte bericht-ID's en verwerk dezelfde levering niet tweemaal.

### Stap 26 — Accepteer een webhook niet als enige waarheid

Gebruik een webhook als signaal om het officiële dossier opnieuw via de API op te halen. Dit vermindert de kans dat een onvolledige of gemanipuleerde webhook direct brongegevens overschrijft.

---

## Deel G — Foutafhandeling en retries

### Stap 27 — Classificeer fouten

| Situatie | Actie |
|---|---|
| 400/422 | Payload of mapping corrigeren; niet blind herhalen |
| 401/403 | Credentials/rechten controleren; synchronisatie pauzeren |
| 404 | Externe ID of endpoint controleren |
| 409 | Conflict tonen en manueel beoordelen |
| 429 | Wachten volgens `Retry-After` |
| 500–599 | Beperkt opnieuw proberen met oplopende wachttijd |
| Timeout | Status onbekend; idempotency controleren vóór herhaling |

### Stap 28 — Maak uitgaande verzoeken idempotent

Gebruik waar ondersteund een idempotency-key, bijvoorbeeld gebaseerd op:

```text
platform + externalId + dossierVersion + actionType
```

Zo leidt een retry niet tot meerdere identieke adviezen.

### Stap 29 — Stel een blokkadeprocedure op

Bij blijvende fout:

1. zet het wachtrij-item op fout;
2. toon de fout aan beheerder;
3. overschrijf geen lokaal advies;
4. meld de fout aan de functioneel eigenaar;
5. herstel de configuratie/mapping;
6. verstuur het specifieke item opnieuw;
7. documenteer oorzaak en oplossing.

---

## Deel H — Acceptatie per gemeente

### Stap 30 — Maak een gemeentelijke acceptatielijst

Per gemeente moet worden bevestigd:

- juiste bronomgeving;
- juiste selectie van dossiers;
- juiste gegevensvelden;
- correcte documenttoegang;
- juiste terugkoppelvelden;
- herkenbare EventRisk-referentie;
- correcte statussen;
- correcte verwerking van wijzigingen en annulaties;
- bevoegde contactpersoon;
- goedkeuring voor productie.

### Stap 31 — Start gefaseerd

Aanbevolen volgorde:

1. één gemeente en één platform;
2. alleen inkomende synchronisatie;
3. gecontroleerde handmatige feedback;
4. automatische feedback;
5. tweede gemeente op hetzelfde platform;
6. tweede platform;
7. zonebrede uitrol.

### Stap 32 — Houd een rollbackmogelijkheid

Voor elke livegang:

- maak een databaseback-up;
- noteer de vorige configuratie;
- houd automatische sync uitzetbaar;
- zorg dat feedback handmatig kan worden geblokkeerd;
- spreek af hoe gemeenten tijdelijk via bestaande kanalen worden geïnformeerd.
