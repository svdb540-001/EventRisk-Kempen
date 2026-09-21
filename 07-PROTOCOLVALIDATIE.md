# 07 — Protocolvalidatie vóór productie

De risicomatrix is overgenomen uit het aangeleverde **werkdocument**. Dat document bevat vraagtekens, lege disciplinewaarden en geen volledig expliciete regel om decimale scores naar RN 0–5 om te zetten. De app maakt deze punten zichtbaar, maar een softwarekeuze mag een formeel zonaal besluit niet vervangen.

---

## 1. Formeel te beslissen punten

### Beslissing 1 — Afronding van disciplinescores

Huidige appinstelling:

```text
Wiskundig afronden naar het dichtstbijzijnde gehele RN
```

Daarna wordt het hoogste RN van D1, D2 en D3 het algemene RN.

Te beslissen alternatieven:

- altijd naar boven afronden;
- wiskundig afronden;
- werken met expliciete scorebanden;
- een andere formeel vastgelegde methode.

Leg ook vast hoe exact `x,50` en negatieve scores behandeld worden.

### Beslissing 2 — Foodtruckfestival

Werkdocument:

- D1 = 0,33;
- D2 leeg;
- D3 leeg.

Huidige voorlopige appwaarde:

```text
D1 0,33 — D2 0 — D3 0
```

### Beslissing 3 — Professionele externe security

Het werkdocument bevat een vraagteken bij de optie. Huidige voorlopige waarde:

```text
D1 -0,33 — D2 0 — D3 0,33
```

Bevestig ook of professionele security in alle situaties een risicoreducerend D1-effect mag hebben.

### Beslissing 4 — Problematisch drank-/drugsgebruik

Het werkdocument bevat een vraagteken. Huidige voorlopige waarde is gelijk aan “overvloedig, met risico”:

```text
D1 0,33 — D2 0,33 — D3 0,66
```

Overweeg of “problematisch” juist een hogere aparte weging nodig heeft.

### Beslissing 5 — Open terrein/weides

Werkdocument:

- D1 = -1;
- D2 leeg;
- D3 leeg.

Huidige voorlopige appwaarde:

```text
D1 -1 — D2 0 — D3 0
```

### Beslissing 6 — Optreden/muziekfestival

Het brondocument vermeldt `???`, maar alle drie waarden zijn 0. Bevestig of dit correct is of dat differentiatie nodig is.

### Beslissing 7 — Reputatie

De rubriek heeft een vraagteken in de bron. Bevestig:

- welke objectieve informatie “goed” of “slecht” bepaalt;
- wie dit mag invullen;
- welke terugkijkperiode geldt;
- hoe nieuwe evenementen worden beoordeeld;
- of motivering verplicht is.

### Beslissing 8 — Manuele opschaling

De app staat alleen een verhoging toe. Bevestig:

- welke rollen mogen opschalen;
- of multidisciplinaire goedkeuring nodig is;
- of motivering verplicht is;
- of een verlaging ooit mag en via welke formele procedure;
- hoe dit in audit en terugkoppeling verschijnt.

---

## 2. Workflow te bevestigen

### RN 0

Huidig:

- geen bijkomende maatregel.

### RN 1

Huidig:

- melding aan disciplines.

### RN 2

Huidig:

- melding;
- inplantingsplan;
- standaardadvies.

Bevestig wanneer een inplantingsplan niet nodig is omdat het evenement in een lokaal doorgaat.

### RN 3

Huidig:

- specifieke adviezen D1/D2/D3;
- voorlopig inplantingsplan bij melding;
- veiligheidsplan;
- definitieve plannen uiterlijk vijf dagen vóór start.

Bevestig of een veiligheidsdossier soms het veiligheidsplan vervangt.

### RN 4

Huidig:

- specifieke adviezen;
- veiligheidsoverleg;
- veiligheidsdossier;
- veiligheidsrondgang;
- definitieve plannen uiterlijk vijf dagen vóór start.

### RN 5

Huidig:

- maatregelen RN 4;
- CP-OPS en multidisciplinaire permanentie;
- evaluatievergadering.

Bevestig wanneer fysieke aanwezigheid per discipline vereist is en hoe dit geregistreerd wordt.

---

## 3. Termijnen te modelleren

Het werkdocument noemt onder meer:

- melding organisator aan gemeente: 60 dagen vóór start;
- melding door gemeente via webtool: binnen 50 dagen vóór start;
- beslissing veiligheidsoverleg: binnen 40 dagen vóór start;
- beslissing controlerondgang: binnen 30 dagen vóór start;
- disciplineadvies: uiterlijk 30 dagen vóór start;
- definitieve plannen/dossier: uiterlijk 5 dagen vóór start.

Omdat gemeenten niet in EventRisk aanmelden, moet worden vastgelegd welke bronstatus of datum uit Eaglebe/Flowlab geldt als officiële melding en hoe EventRisk ontbrekende of laattijdige documenten signaleert.

---

## 4. Rollen te bevestigen

Voorgestelde applicatierollen:

| App-rol | Functie |
|---|---|
| EventRisk.Admin | technisch/functioneel beheer en integraties |
| EventRisk.Coordinator | multidisciplinaire dossiercoördinatie |
| EventRisk.D1 | brandweeradvies |
| EventRisk.D2 | medische disciplineadvies |
| EventRisk.D3 | politieadvies |

Te beslissen:

- wie gedeelde dossiergegevens mag aanpassen;
- wie RN mag opschalen;
- wie een dossier definitief mag afsluiten;
- wie een terugkoppeling opnieuw mag versturen;
- wie fouten/conflicten mag oplossen;
- wie rapporten mag exporteren;
- of sommige gebruikers meerdere rollen krijgen.

---

## 5. Terugkoppeling naar gemeenten

Omdat gemeenten niet aanmelden, ziet de gemeente resultaten via Eaglebe of Flowlab. Formeel te beslissen:

1. Welke resultaten zijn informatief?
2. Welke resultaten gelden als formeel advies?
3. Mag een conceptadvies worden teruggestuurd?
4. Wanneer wordt een advies definitief?
5. Kan een definitief advies later worden ingetrokken of vervangen?
6. Hoe wordt versiebeheer zichtbaar?
7. Wie ontvangt een melding bij wijziging?
8. Welke EventRisk-status vertaalt naar welke gemeentelijke status?
9. Wordt een PDF-advies gegenereerd of alleen gestructureerde data?
10. Welke gegevens mogen niet naar het gemeentelijk loket terugvloeien?

---

## 6. Validatieprocedure

Aanbevolen formele werkwijze:

### Stap 1 — Maak een beslisdocument

Kopieer alle punten uit dit document naar een genummerde beslislijst.

### Stap 2 — Laat disciplines inhoudelijk valideren

- D1 valideert D1-waarden en maatregelen;
- D2 valideert D2-waarden en maatregelen;
- D3 valideert D3-waarden en maatregelen;
- noodplanning/coördinatie valideert multidisciplinaire workflow.

### Stap 3 — Test met historische dossiers

Neem minstens:

- klein evenement;
- middelgroot evenement;
- fuif;
- sportwedstrijd;
- markt/stoet;
- groot festival;
- evenement met slechte bereikbaarheid;
- evenement met vuurwerk/open vuur;
- wederkerend probleemgeval.

Bereken handmatig en met de app. Onderzoek elk verschil.

### Stap 4 — Keur een versienummer goed

Bijvoorbeeld:

```text
EventRisk-risicomatrix Kempen 1.0 — goedgekeurd op DD/MM/JJJJ
```

### Stap 5 — Bevries de productieconfiguratie

1. Pas `config/risk-matrix.json` aan.
2. Voeg een changelog toe.
3. Laat code review uitvoeren.
4. Laat tests slagen.
5. maak release/tag;
6. deploy naar acceptatie;
7. laat functionele eigenaar goedkeuren;
8. deploy naar productie.

### Stap 6 — Beheer latere wijzigingen

Elke matrixwijziging moet bevatten:

- reden;
- beslissingsorgaan;
- datum;
- oude waarde;
- nieuwe waarde;
- impactanalyse;
- testbewijs;
- ingangsdatum;
- communicatie naar gebruikers en gemeenten.

Wijzig nooit rechtstreeks losse productievelden zonder versiebeheer.
