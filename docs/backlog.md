# Product Backlog (MVP)

## Epic 1 – Identity & Access (Entra ID)

### US-1.1 Login met Microsoft
**Als** medewerker
**wil ik** inloggen met mijn Microsoft account
**zodat** ik veilig toegang heb.

**Acceptatiecriteria**
- OIDC login flow werkt end-to-end.
- Alleen geautoriseerde tenant/accounts krijgen toegang.
- Session/token refresh werkt correct.

### US-1.2 Rolmapping
**Als** beheerder
**wil ik** dat Entra groepen naar app-rollen mappen
**zodat** rechten automatisch correct zijn.

**Acceptatiecriteria**
- Min. rollen: gemeente, d1, d2, d3, beheerder, organisator.
- Onbekende rol = geen toegang.

---

## Epic 2 – Dossierbeheer & Risicoanalyse

### US-2.1 Dossier aanmaken/bewerken
- Wizard met eventgegevens, organisator, planning.
- Draft en submit statussen.

### US-2.2 RN-berekening
- D1/D2/D3 score op basis van matrix.
- Automatisch RN + manuele opschaling met verplichte motivatie.

### US-2.3 Maatregelen & sneladvies
- Automatische maatregelenset per RN.
- Sneladviesregels op basis van risicofactoren.

---

## Epic 3 – Adviesworkflow

### US-3.1 Adviesverzoeken D1/D2/D3
- Vanaf configureerbaar RN-niveau.
- Status: not_requested/pending/approved.

### US-3.2 Adviesregistratie
- Discipline kan adviestekst registreren en goedkeuren.
- Historiek wordt bijgehouden.

---

## Epic 4 – Documenten

### US-4.1 Upload + metadata
- Meerdere documenten per dossier.
- Typeclassificatie (inplantingsplan, veiligheidsplan, ...).

### US-4.2 Documentvereisten per RN
- Checklist dynamisch op basis van RN.

---

## Epic 5 – Integratie Eaglebe/Flowlab (2-way)

### US-5.1 Inbound import
- Nieuwe/gewijzigde dossiers worden automatisch geïmporteerd.
- Upsert op external ID.

### US-5.2 Outbound feedback
- RN/scores/adviezen/status worden teruggekoppeld.
- Queue + retry + foutafhandeling.

### US-5.3 Sync dashboard
- Status per koppeling.
- Historiek + handmatige “resend”.

---

## Epic 6 – Audit, Security & GDPR

### US-6.1 Audit trail
- Wijzigingen en synchronisaties volledig traceerbaar.

### US-6.2 GDPR controls
- Dataminimalisatie, bewaartermijnen, toegangscontrole.

---

## Epic 7 – Rapportering

### US-7.1 Dossierrapport
- Print/export van risicoanalyse, maatregelen en adviezen.

### US-7.2 CSV-overzicht
- Exporteerbare dossierlijsten met filters.
