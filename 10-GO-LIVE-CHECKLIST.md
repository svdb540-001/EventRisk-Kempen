# 10 — EventRisk Kempen go-livechecklist

Gebruik deze checklist voor de formele acceptatie. Vul eigenaar, datum, bewijs en resultaat in een apart go-liveverslag in.

---

## A. Eigenaarschap

- [ ] Functionele eigenaar aangeduid.
- [ ] Technische applicatiebeheerder aangeduid.
- [ ] Entra-gebruikersbeheerder aangeduid.
- [ ] Azure-beheerder aangeduid.
- [ ] Privacyverantwoordelijke aangeduid.
- [ ] Informatieveiligheidsverantwoordelijke aangeduid.
- [ ] Contactpersoon D1 aangeduid.
- [ ] Contactpersoon D2 aangeduid.
- [ ] Contactpersoon D3 aangeduid.
- [ ] Contactpersoon Eaglebe aangeduid.
- [ ] Contactpersoon Flowlab aangeduid.

## B. Protocol en werking

- [ ] Risicomatrix formeel gevalideerd.
- [ ] Openstaande vraagtekens uit het werkdocument opgelost.
- [ ] RN-afrondingsregel goedgekeurd.
- [ ] Hoogste disciplinescore als algemeen RN goedgekeurd of aangepast.
- [ ] Manuele opschalingprocedure goedgekeurd.
- [ ] Maatregelen per RN goedgekeurd.
- [ ] Vereiste documenten per RN goedgekeurd.
- [ ] Adviesworkflow D1/D2/D3 goedgekeurd.
- [ ] Termijnen en herinneringen goedgekeurd.
- [ ] Evaluatieprocedure voor terugkerende evenementen goedgekeurd.

## C. Microsoft Entra ID

- [ ] API-appregistratie bestaat.
- [ ] SPA-appregistratie bestaat.
- [ ] API-scope bestaat.
- [ ] EventRisk.Admin bestaat.
- [ ] EventRisk.Coordinator bestaat.
- [ ] EventRisk.D1 bestaat.
- [ ] EventRisk.D2 bestaat.
- [ ] EventRisk.D3 bestaat.
- [ ] Geen gemeente- of organisatorrol bestaat.
- [ ] Single tenant ingesteld.
- [ ] Productie-redirect URI correct.
- [ ] Lokale redirect URI alleen behouden wanneer nodig.
- [ ] Toewijzing vereist voor toegang.
- [ ] Groepen of gebruikers correct toegewezen.
- [ ] Minstens één noodbeheeraccount getest.
- [ ] Periodieke toegangsreview ingepland.

## D. Azure

- [ ] Resource group met tags ingericht.
- [ ] App Service draait Node.js 24 LTS.
- [ ] HTTPS Only actief.
- [ ] FTPS uitgeschakeld.
- [ ] Healthcheck `/api/health` actief.
- [ ] Managed identity actief.
- [ ] PostgreSQL Flexible Server actief.
- [ ] PostgreSQL TLS actief.
- [ ] Database `eventrisk` bestaat.
- [ ] Back-upretentie goedgekeurd.
- [ ] Hersteltest gepland of uitgevoerd.
- [ ] Blob-container is private.
- [ ] Blob soft delete actief.
- [ ] Storage Blob Data Contributor alleen aan de juiste identiteit toegekend.
- [ ] Key Vault soft delete actief.
- [ ] Key Vault purge protection actief.
- [ ] Databasewachtwoord via Key Vault-reference.
- [ ] Geen secrets in GitHub.
- [ ] Geen secrets in `.env.example`.
- [ ] Netwerkmodel beoordeeld.
- [ ] Eventuele overstap naar private access/VNet gepland of uitgevoerd.
- [ ] Logging en waarschuwingen ingericht.
- [ ] Kostenbudget en waarschuwing ingericht.

## E. GitHub

- [ ] Repository is private.
- [ ] Organisatie-eigendom gebruikt.
- [ ] Minstens twee beheerders.
- [ ] Tweestapsverificatie verplicht.
- [ ] Branch protection op `main`.
- [ ] Pull request vereist voor productiecode.
- [ ] CI moet slagen voor merge.
- [ ] `production` Environment bestaat.
- [ ] Required reviewers ingesteld.
- [ ] OIDC gebruikt; geen langdurig Azure-wachtwoord.
- [ ] GitHub Pages niet gebruikt als productiehosting.
- [ ] Azure-URL als officiële URL gecommuniceerd.
- [ ] Secret scanning en Dependabot volgens beleid actief.

## F. Applicatietesten

- [ ] `/api/health` geeft `ok: true`.
- [ ] Loginpagina opent zonder JSON-fout.
- [ ] Microsoft-login werkt.
- [ ] Gebruiker zonder rol wordt geweigerd.
- [ ] D1 ziet de juiste functies.
- [ ] D2 ziet de juiste functies.
- [ ] D3 ziet de juiste functies.
- [ ] Coordinator ziet gedeelde bewerking.
- [ ] Admin ziet Integraties.
- [ ] Admin ziet Auditlog.
- [ ] D1 kan geen D2-advies opslaan.
- [ ] D2 kan geen D3-advies opslaan.
- [ ] D3 kan geen integratiebeheer uitvoeren.
- [ ] Concurrente wijziging geeft versieconflict.
- [ ] Dossier blijft na herstart bestaan.
- [ ] Document blijft na herstart bestaan.
- [ ] Niet-toegelaten bestandstype wordt geweigerd.
- [ ] Uploadlimiet werkt.
- [ ] Auditlog registreert create/update/advice/upload/sync.
- [ ] Kalender en filters werken.
- [ ] RN-berekening met referentiedossiers gevalideerd.

## G. Eaglebe

- [ ] Leveranciersdocumentatie ontvangen.
- [ ] Sandbox beschikbaar.
- [ ] Authenticatiemethode bevestigd.
- [ ] Importendpoint bevestigd.
- [ ] Changed-since of webhook bevestigd.
- [ ] Unieke externe dossier-id bevestigd.
- [ ] Veldmapping schriftelijk goedgekeurd.
- [ ] Datums en tijdzones getest.
- [ ] Documentenstroom getest of expliciet buiten scope.
- [ ] Schrijfbare adviesvelden bevestigd.
- [ ] Terugkoppelstatussen bevestigd.
- [ ] Foutcodes en retrybeleid bevestigd.
- [ ] Snelheidslimiet bevestigd.
- [ ] Minstens tien representatieve sandboxdossiers getest.
- [ ] Dubbele import getest.
- [ ] Wijziging van bestaand dossier getest.
- [ ] Terugkoppeling getest.
- [ ] Connector pas daarna geactiveerd.

## H. Flowlab

- [ ] Leveranciersdocumentatie ontvangen.
- [ ] Sandbox beschikbaar.
- [ ] Authenticatiemethode bevestigd.
- [ ] Importendpoint bevestigd.
- [ ] Webhookhandtekening bevestigd.
- [ ] Unieke externe dossier-id bevestigd.
- [ ] Veldmapping schriftelijk goedgekeurd.
- [ ] Datums en tijdzones getest.
- [ ] Documentenstroom getest of expliciet buiten scope.
- [ ] Schrijfbare adviesvelden bevestigd.
- [ ] Terugkoppelstatussen bevestigd.
- [ ] Foutcodes en retrybeleid bevestigd.
- [ ] Snelheidslimiet bevestigd.
- [ ] Minstens tien representatieve sandboxdossiers getest.
- [ ] Dubbele import getest.
- [ ] Wijziging van bestaand dossier getest.
- [ ] Terugkoppeling getest.
- [ ] Connector pas daarna geactiveerd.

## I. Privacy en beveiliging

- [ ] Doel en rechtsgrond beschreven.
- [ ] Gegevenscategorieën geïnventariseerd.
- [ ] Rollen verwerkingsverantwoordelijke/verwerker vastgelegd.
- [ ] Verwerkersovereenkomsten gecontroleerd.
- [ ] Bewaartermijnen vastgelegd.
- [ ] Automatische verwijdering of archivering gepland.
- [ ] DPIA-behoefte beoordeeld.
- [ ] Incidentmeldingsprocedure vastgelegd.
- [ ] Datalekprocedure getest.
- [ ] Logging bevat geen overmatige persoonsgegevens of secrets.
- [ ] Documenten worden op malware gecontroleerd of quarantaineproces bestaat.
- [ ] Penetratietest of security review uitgevoerd volgens risicoklasse.
- [ ] Kwetsbaarheidsscanning en dependency-updates ingericht.
- [ ] Continuïteits- en herstelprocedure goedgekeurd.

## J. Communicatie en ondersteuning

- [ ] Officiële productie-URL vastgelegd.
- [ ] GitHub Pages-URL niet verspreid.
- [ ] Gebruikershandleiding beschikbaar.
- [ ] Beheerhandleiding beschikbaar.
- [ ] Eerste lijn ondersteuning aangeduid.
- [ ] Escalatie naar technisch beheer vastgelegd.
- [ ] Escalatie naar Eaglebe vastgelegd.
- [ ] Escalatie naar Flowlab vastgelegd.
- [ ] Onderhoudsvenster vastgelegd.
- [ ] Gebruikers geïnformeerd over go-live.
- [ ] Opleiding D1/D2/D3 uitgevoerd.

## K. Go/no-go

- [ ] Alle blokkerende bevindingen opgelost.
- [ ] Resterende risico's schriftelijk aanvaard.
- [ ] Functionele eigenaar geeft GO.
- [ ] Technische beheerder geeft GO.
- [ ] Informatieveiligheid geeft GO.
- [ ] Privacy geeft GO.
- [ ] D1 geeft GO.
- [ ] D2 geeft GO.
- [ ] D3 geeft GO.
- [ ] Go-livedatum en terugvalplan vastgelegd.
