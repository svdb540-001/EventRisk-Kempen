# 05 — Productie en beveiliging

EventRisk Kempen verwerkt evenementgegevens, contactgegevens, operationele adviezen en mogelijk veiligheidsgevoelige informatie. Behandel de toepassing daarom als een afgeschermde professionele toepassing, niet als een publieke website.

---

## 1. Minimale productievoorwaarden

Zet de app niet publiek in productie voordat minimaal geregeld is:

1. Microsoft Entra ID met app-rollen en MFA-beleid;
2. uitsluitend HTTPS;
3. secrets buiten GitHub en buiten de containerimage;
4. productieback-up en getest herstel;
5. centrale monitoring en waarschuwingen;
6. leveranciers-testomgevingen en goedgekeurde mappings;
7. protocolvalidatie;
8. privacy-/informatieclassificatie;
9. verwerkers- en samenwerkingsafspraken;
10. incident- en continuïteitsprocedure.

---

## 2. Omgevingen scheiden

Gebruik minimaal:

- **Development** — lokale mockdata;
- **Test/acceptatie** — geanonimiseerde of expliciete testdossiers en leverancierstest-API's;
- **Productie** — echte dossiers en echte credentials.

Gebruik per omgeving:

- aparte database;
- aparte Entra-appregistratie of aantoonbaar gescheiden redirect-URI's en rechten;
- aparte leverancierscredentials;
- aparte secret store;
- aparte logging;
- duidelijk zichtbare omgevingsnaam.

Kopieer productiedata niet zomaar naar development.

---

## 3. Productievariabelen

Minimaal:

```env
NODE_ENV=production
AUTH_MODE=entra
APP_BASE_URL=https://eventrisk.organisatie.be
MOCK_CONNECTORS=false
```

Daarnaast vult u alle Entra- en actieve connectorwaarden in via veilige platforminstellingen. Plaats geen productie-`.env` in de repository.

---

## 4. Netwerkbeveiliging

### Publieke ingang

- gebruik HTTPS met geldig certificaat;
- forceer HTTP → HTTPS;
- overweeg toegang via een reverse proxy, WAF of Azure Front Door/Application Gateway;
- beperk beheerendpoints waar mogelijk;
- pas rate limiting toe;
- stel een maximale requestgrootte in;
- blokkeer ongebruikte methoden.

### Uitgaand verkeer

Sta alleen noodzakelijke verbindingen toe naar:

- Microsoft login/OIDC/JWKS;
- Eaglebe-test/productie-API;
- Flowlab-test/productie-API;
- centrale logging/monitoring;
- eventuele malware- of documentopslagdienst.

Documenteer DNS-namen en poorten.

---

## 5. Secrets en sleutels

Bewaar als geheim:

- Eaglebe client secret;
- Flowlab API-key;
- webhooksecret;
- databasecredentials bij migratie naar beheerde DB;
- opslag- of scancredentials;
- eventuele signing keys.

Regels:

1. nooit committen;
2. nooit in screenshots/tickets plakken;
3. nooit in frontend-JavaScript zetten;
4. alleen runtime-toegang;
5. least privilege;
6. vervaldatum en eigenaar registreren;
7. periodiek roteren;
8. onmiddellijk vervangen na mogelijk lek.

De Microsoft SPA client ID is geen geheim. Client secrets horen uitsluitend bij server-side vertrouwelijke clients/connectors.

---

## 6. Databasekeuze

### Lokaal

SQLite blijft beschikbaar voor eenvoudige lokale ontwikkeling zonder externe infrastructuur.

### Productie

Versie 2.0 vereist PostgreSQL wanneer `NODE_ENV=production`. De server weigert te starten met SQLite. Gebruik Azure Database for PostgreSQL Flexible Server of een door de organisatie beheerde PostgreSQL-dienst, met TLS, back-up, monitoring en geteste herstelprocedure.

De toepassing maakt de noodzakelijke tabellen bij de eerste start aan. Wijzigingen aan het databaseschema moeten vóór elke latere release via gecontroleerde migraties en rollbacktests verlopen.

---

## 7. Back-up en herstel

Leg vast:

- RPO: hoeveel gegevensverlies maximaal aanvaardbaar is;
- RTO: hoe snel de toepassing hersteld moet zijn;
- back-upfrequentie;
- retentie;
- versleuteling;
- opslaglocatie;
- wie herstel mag uitvoeren.

Voor PostgreSQL en Blob Storage:

1. configureer databaseback-upretentie volgens RPO/RTO;
2. activeer soft delete en passende retentie voor blobs;
3. documenteer herstel van één dossier, één document en de volledige omgeving;
4. test herstel minimaal per kwartaal;
5. bewaar infrastructuurcode en configuratieversies afzonderlijk van de gegevensback-up.

---

## 8. Documentbeveiliging

Productie-aanbevelingen:

- bewaar documenten buiten de publieke webroot;
- gebruik willekeurige interne bestandsnamen;
- valideer extensie én inhoudstype;
- beperk grootte;
- scan malware;
- zet verdachte bestanden in quarantaine;
- controleer autorisatie bij elke download;
- gebruik versleuteling at rest;
- log upload en download waar dit proportioneel is;
- definieer bewaartermijnen.

Open nooit rechtstreeks door de gebruiker aangeleverde actieve HTML/SVG zonder veilige behandeling.

---

## 9. Logging en audit

### Auditlog

Audit minimaal:

- dossier aangemaakt/geïmporteerd;
- bronwijziging verwerkt;
- RN berekend of manueel opgeschaald;
- advies opgeslagen/goedgekeurd;
- document toegevoegd/verwijderd;
- terugkoppeling verstuurd;
- integratiefout;
- beheerderswijziging.

### Niet loggen

- bearer tokens;
- wachtwoorden;
- client secrets;
- API-keys;
- volledige gevoelige documenten;
- onnodige persoonsgegevens.

### Centrale monitoring

Maak meldingen voor:

- herhaalde 401/403;
- connector langer dan afgesproken niet succesvol;
- groeiende uitgaande wachtrij;
- veel 5xx-fouten;
- schijfruimte laag;
- databasefout;
- malwaredetectie;
- onverwachte beheerdersactiviteit.

---

## 10. Privacy en gegevensbeheer

Laat de verantwoordelijke en DPO bepalen:

- rechtsgrond en doeleinden;
- welke persoonsgegevens noodzakelijk zijn;
- rollen van gemeenten, zone en leveranciers;
- informatieplicht;
- bewaartermijnen;
- toegangs- en correctieprocedure;
- doorgifte en subverwerkers;
- loggingretentie;
- DPIA-noodzaak;
- verwerking van incident- of operationeel gevoelige informatie.

Pas dataminimalisatie toe: importeer niet automatisch elk formulierantwoord wanneer de hulpdiensten het niet nodig hebben.

---

## 11. Secure development

Voor elke wijziging:

1. maak een branch;
2. voer code review uit;
3. draai tests;
4. controleer autorisatie server-side;
5. valideer input;
6. gebruik parameterized databasequeries;
7. ontsmet output waar HTML wordt opgebouwd;
8. voeg geen geheim toe;
9. update documentatie;
10. deploy eerst naar acceptatie.

De browserinterface is geen beveiligingsgrens. Elke gevoelige actie moet op de server opnieuw worden geautoriseerd.

---

## 12. Updates en kwetsbaarheden

Hoewel deze startversie weinig externe Node-afhankelijkheden gebruikt:

- update Node.js tijdig naar ondersteunde securityreleases;
- controleer gebruikte browserbibliotheken;
- pin versies;
- gebruik Subresource Integrity of host bibliotheken intern waar passend;
- volg GitHub security alerts;
- voer periodieke penetratie- en configuratietests uit;
- verwijder ongebruikte code en endpoints.

---

## 13. Incidentprocedure

Bij mogelijk datalek of compromittering:

1. registreer tijdstip en melder;
2. beperk toegang of pauzeer connectoren;
3. bewaar relevante logs;
4. roteer getroffen secrets/tokens;
5. bepaal getroffen dossiers en personen;
6. informeer CISO/DPO/verantwoordelijke;
7. volg wettelijke en interne meldprocedures;
8. herstel uit schone bron;
9. test vóór heropening;
10. documenteer oorzaakanalyse en maatregelen.

Wis geen bewijslogs zonder akkoord van incidentverantwoordelijke.

---

## 14. Continuïteit

Voorzie een tijdelijke werkwijze wanneer EventRisk niet beschikbaar is:

- wie ontvangt dringende dossiers;
- hoe adviezen veilig worden uitgewisseld;
- hoe wijzigingen later worden ingevoerd;
- hoe dubbele terugkoppeling wordt vermeden;
- welke contactnummers gelden;
- wanneer een incident wordt opgeschaald.

Test deze procedure minstens jaarlijks.
