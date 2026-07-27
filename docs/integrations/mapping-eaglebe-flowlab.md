# Mapping – Eaglebe / Flowlab <-> EventRisk

## Canonieke velden (EventRisk)
- event.reference
- event.name
- event.municipality
- event.start_at
- event.end_at
- event.address
- event.organizer_name
- event.contact_name
- risk.answers
- risk.factors
- risk.final_rn
- risk.discipline_scores
- advice.status_by_discipline
- event.status

## Inbound mapping (extern -> EventRisk)

### Eaglebe
- eaglebe.eventId -> external_links.external_id
- eaglebe.title -> events.name
- eaglebe.location.address -> events.address
- eaglebe.city -> events.municipality
- eaglebe.startDateTime -> events.start_at
- eaglebe.endDateTime -> events.end_at
- eaglebe.organizer.name -> events.organizer_name
- eaglebe.organizer.contact -> events.contact_name
- eaglebe.form.answers.* -> risk_assessments.answers

### Flowlab
- flowlab.dossierId -> external_links.external_id
- flowlab.eventName -> events.name
- flowlab.address.full -> events.address
- flowlab.municipality -> events.municipality
- flowlab.schedule.start -> events.start_at
- flowlab.schedule.end -> events.end_at
- flowlab.organizer.organization -> events.organizer_name
- flowlab.organizer.person -> events.contact_name
- flowlab.riskInput.* -> risk_assessments.answers

## Outbound mapping (EventRisk -> extern)
- events.reference -> eventrisk_reference
- risk_assessments.final_rn -> risk.general_rn
- risk_assessments.auto_rn -> risk.automatic_rn
- risk_assessments.d1_score/d2_score/d3_score -> risk.discipline_scores
- advice_requests(status/text) -> advice_status
- events.status -> dossier_status
- generated report ref -> report.reference

## Sync policy
- Externe aanvraagvelden: extern leidend
- EventRisk berekende velden: EventRisk leidend
- Conflicten loggen + markeren voor manuele review indien nodig
