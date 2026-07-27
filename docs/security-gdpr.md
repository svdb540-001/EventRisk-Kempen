# Security & GDPR

## 1. Authenticatie
- Microsoft Entra ID verplicht
- MFA policy op tenantniveau aanbevolen
- Geen lokale wachtwoorden in EventRisk

## 2. Autorisatie
- RBAC met rollen: gemeente, d1, d2, d3, beheerder, organisator
- Principle of least privilege
- Endpoint-level autorisatie checks

## 3. Gegevensbescherming
- TLS in transit
- Encryptie at rest (DB + storage)
- Secrets in Azure Key Vault (of equivalent)

## 4. Audit & traceability
- Onwijzigbare auditlogs voor:
  - dossierwijzigingen
  - risicoberekeningen
  - adviesupdates
  - sync-operaties

## 5. GDPR basismaatregelen
- Dataminimalisatie
- Doelbinding
- Bewaartermijnen per datatype
- Recht op inzage/correctie/processen
- Verwerkersovereenkomsten met leveranciers

## 6. Integratiebeveiliging
- Signed webhook requests (HMAC)
- OAuth2 client credentials of API keys volgens leverancier
- IP allowlisting waar mogelijk
- Retry + dead-letter zonder data-lekken

## 7. Operationele beveiliging
- Backups + restore tests
- Monitoring op verdachte login/sync patronen
- Incident response playbook
