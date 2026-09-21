# 04 — Testplan EventRisk Kempen

Gebruik dit document vóór elke piloot, release en productie-ingebruikname. Noteer per test: datum, tester, omgeving, resultaat, bewijs en ticketnummer.

---

## 1. Technische basistest

### T01 — Codecontrole

```powershell
npm run check
```

Verwacht: geen syntaxfout en exitcode 0.

### T02 — Automatische risicotests

```powershell
npm test
```

Verwacht: alle tests slagen.

### T03 — Serverstart development

1. `AUTH_MODE=development`.
2. `NODE_ENV=development`.
3. Start `npm run dev`.
4. Open `/api/health`.

Verwacht: status `ok`.

### T04 — Development-login geblokkeerd in productie

1. Zet `NODE_ENV=production`.
2. Laat `AUTH_MODE=development`.
3. Start de server.

Verwacht: de server weigert te starten.

---

## 2. Microsoft-authenticatie

### A01 — Geldige beheerder

Verwacht: aanmelden lukt en rol `EventRisk.Admin` verschijnt.

### A02 — Geldige D1-gebruiker

Verwacht: aanmelden lukt; alleen D1-advies is bewerkbaar.

### A03 — Geldige D2-gebruiker

Verwacht: aanmelden lukt; alleen D2-advies is bewerkbaar.

### A04 — Geldige D3-gebruiker

Verwacht: aanmelden lukt; alleen D3-advies is bewerkbaar.

### A05 — Gebruiker zonder rol

Verwacht: toegang geweigerd.

### A06 — Gebruiker uit andere tenant

Verwacht: toegang geweigerd wegens niet-toegelaten tenant.

### A07 — Verlopen token

Verwacht: API retourneert 401; gebruiker moet opnieuw aanmelden.

### A08 — Token voor andere API

Verwacht: API weigert het token wegens verkeerde audience.

### A09 — Afmelden

Verwacht: lokale tokens worden verwijderd en beveiligde gegevens zijn niet meer zichtbaar.

---

## 3. Rollen en autorisatie

### R01 — Gemeenterol bestaat niet

Controleer Entra, `.env`, frontend en server. Verwacht: nergens een gemeente-, organisator- of burgerrol.

### R02 — D1 kan D2 niet wijzigen

Verwacht: 403 bij rechtstreekse API-poging, ook als de browserknop gemanipuleerd wordt.

### R03 — D2 kan D3 niet wijzigen

Verwacht: 403.

### R04 — D3 kan D1 niet wijzigen

Verwacht: 403.

### R05 — Alleen beheerder beheert integraties

Verwacht: niet-beheerders kunnen geen connectorconfiguratie of handmatige globale sync starten wanneer de route beheerdersrechten vereist.

### R06 — Coördinator gedeelde dossierwijziging

Verwacht: toegelaten gedeelde velden kunnen worden bijgewerkt; disciplineadvies volgt de vastgelegde rolmatrix.

---

## 4. Dossierimport

### I01 — Nieuw Eaglebe-dossier

Verwacht: één lokaal dossier met platform `eaglebe` en de juiste externe ID.

### I02 — Nieuw Flowlab-dossier

Verwacht: één lokaal dossier met platform `flowlab`.

### I03 — Dezelfde import opnieuw

Verwacht: geen duplicaat; bestaand dossier wordt herkend.

### I04 — Gewijzigd brondossier

Verwacht: wijzigbare bronvelden worden bijgewerkt en auditlog vermeldt de import.

### I05 — Onbekende velden

Verwacht: import faalt niet door extra velden; relevante onbekende gegevens worden niet willekeurig opgeslagen.

### I06 — Verplicht veld ontbreekt

Verwacht: duidelijke fout of quarantainestatus; geen half dossier dat als volledig wordt voorgesteld.

### I07 — Meerdere gemeenten

Verwacht: gemeente blijft correct gekoppeld en filters werken.

### I08 — Tijdzone

Test een evenement rond zomer-/winteruur. Verwacht: lokale tijd in België blijft correct.

### I09 — Annulatie

Verwacht: status wordt geannuleerd/afgesloten; dossier en audit blijven behouden.

### I10 — Documentreferentie

Verwacht: document wordt veilig opgehaald of als externe referentie bewaard volgens de integratieafspraak.

---

## 5. Risicoberekening

### B01 — Minder dan 100 zonder bijkomende risico's

Verwacht: RN 0.

### B02 — 100–499 zonder verhogers

Verwacht: basis RN 1.

### B03 — 500–2.000 zonder verhogers

Verwacht: basis RN 2.

### B04 — 2.001–5.000 zonder verhogers

Verwacht: basis RN 3.

### B05 — 5.001–20.000 zonder verhogers

Verwacht: basis RN 4.

### B06 — Meer dan 20.000

Verwacht: RN 5.

### B07 — Hoogste discipline bepaalt algemeen RN

Maak D3 hoger dan D1/D2. Verwacht: algemeen RN gelijk aan D3-RN.

### B08 — Negatieve factoren

Verwacht: disciplinescore mag dalen, maar RN wordt begrensd tussen 0 en 5.

### B09 — Manuele opschaling

Verwacht: hogere RN wordt toegepast met motivering.

### B10 — Manuele verlaging

Verwacht: de gebruiker kan via manuele opschaling het automatische RN niet verlagen.

### B11 — Onvolledige analyse

Verwacht: geen definitief resultaat zonder alle verplichte parameters.

### B12 — Te valideren opties

Test Foodtruckfestival, professionele security, problematisch middelengebruik en open terrein. Verwacht: waarden volgen configuratie en worden in protocolvalidatie expliciet gemarkeerd.

---

## 6. Protocolworkflow

### P01 — RN 2

Verwacht: inplantingsplan en standaardadvies.

### P02 — RN 3

Verwacht: specifieke adviezen D1/D2/D3, inplantingsplan en veiligheidsplan.

### P03 — RN 4

Verwacht: veiligheidsoverleg, veiligheidsdossier en rondgang.

### P04 — RN 5

Verwacht: CP-OPS/permanentie en evaluatievergadering.

### P05 — Definitieve documenten

Verwacht: deadlinecontrole uiterlijk vijf dagen voor start waar protocol dit voorschrijft.

### P06 — Adviesdeadline

Verwacht: taak/deadline kan 30 dagen vóór start opvolgen.

---

## 7. Adviezen en terugkoppeling

### O01 — D1-advies bewaren

Verwacht: tekst, status, auteur en tijdstip worden bewaard; auditregel ontstaat.

### O02 — D2-advies bewaren

Zelfde verwachting.

### O03 — D3-advies bewaren

Zelfde verwachting.

### O04 — Wachtrij-item ontstaat

Verwacht: relevante wijziging voor een extern dossier komt in de uitgaande wachtrij.

### O05 — Payload-preview

Verwacht: alleen afgesproken velden, geen interne secrets of onnodige persoonsgegevens.

### O06 — Succesvolle verzending

Verwacht: status `synced`, extern antwoord geregistreerd zonder credentials te loggen.

### O07 — Tijdelijke serverfout

Verwacht: foutstatus en beperkte retry; lokaal advies blijft behouden.

### O08 — Validatiefout 400/422

Verwacht: niet eindeloos herhalen; duidelijke beheeractie vereist.

### O09 — Dubbele klik

Verwacht: geen dubbele externe adviesregistratie indien idempotency beschikbaar is.

### O10 — Extern conflict

Verwacht: conflict zichtbaar; geen stille overschrijving.

---

## 8. Documenten

### D01 — Toegelaten bestand

Upload PDF kleiner dan limiet. Verwacht: opslag en metadata correct.

### D02 — Te groot bestand

Verwacht: weigering met begrijpelijke melding.

### D03 — Ongewenst bestandstype

Verwacht: weigering volgens toegestane lijst en contentcontrole.

### D04 — Bestandsnaam met speciale tekens

Verwacht: veilige serverbestandsnaam; oorspronkelijke naam alleen als metadata.

### D05 — Onbevoegde download

Verwacht: 401/403.

### D06 — Malwarecontrole

In productie moet het gekozen opslag-/scanproces een besmet testbestand blokkeren of in quarantaine zetten.

---

## 9. Audit en logging

### L01 — Aanmelding

Verwacht: alleen noodzakelijke beveiligingsinformatie, geen toegangstoken.

### L02 — Dossierwijziging

Verwacht: gebruiker, actie, dossier, tijdstip en relevante wijziging.

### L03 — Advieswijziging

Verwacht: discipline en status traceerbaar.

### L04 — Synchronisatie

Verwacht: platform, richting, externe ID, status en foutcategorie.

### L05 — Secrets

Zoek logs op client secret, API-key en bearer token. Verwacht: geen resultaten.

---

## 10. Gebruiksvriendelijkheid en toegankelijkheid

### U01 — Desktop

Test 1920×1080 en 1366×768.

### U02 — Tablet

Test liggend en staand.

### U03 — Smartphone

Test navigatie, tabellen en formulierstappen.

### U04 — Toetsenbord

Alle functies moeten bereikbaar zijn zonder muis.

### U05 — Focus

Zichtbare focus op knoppen, velden en dialogen.

### U06 — Foutmeldingen

Niet alleen kleur gebruiken; tekst moet uitleggen wat fout is.

### U07 — Contrast

Controleer rode, groene en grijze statussen volgens de interne toegankelijkheidsnorm.

---

## 11. Prestatie en herstel

### S01 — 1.000 dossiers

Verwacht: lijst, zoeken en filters blijven bruikbaar.

### S02 — Gelijktijdige gebruikers

Test representatief aantal D1/D2/D3-gebruikers.

### S03 — Back-up

Maak back-up, verwijder testdata en herstel. Verwacht: dossiers, adviezen en audit terug.

### S04 — Connector tijdelijk onbeschikbaar

Verwacht: app blijft lokaal bruikbaar; wachtrij bewaart uitgaande acties.

### S05 — Serverherstart

Verwacht: geen verlies van opgeslagen dossiers en wachtrij.

---

## 12. Go/no-go

Productie is pas **GO** wanneer:

- alle kritieke tests slagen;
- Entra-rollen formeel goedgekeurd zijn;
- protocolonduidelijkheden beslist zijn;
- beide leveranciersmappings voor de piloot bevestigd zijn;
- beveiligings- en privacybeoordeling afgerond is;
- back-up en herstel getest zijn;
- beheer- en incidentprocedure beschikbaar zijn;
- verantwoordelijke eigenaar schriftelijk goedkeurt.
