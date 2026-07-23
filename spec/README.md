# JFF EHR spec folder

Companion to JFF_EHR_build_brief.md. This folder holds the field-level and layout-level
authority the brief refers to when it says "wireframe exists, match it" and "the form
wins over the brief".

No em dashes anywhere in this project. Enforce it in all generated code, copy, comments,
commits, and docs.

## forms/
Field-level specs extracted from the seven JFF paper forms. These are the AUTHORITY for
form fields. Where a form spec and the build brief disagree, the form spec wins, and you
flag the discrepancy rather than silently choosing.

- 01 Camper registration + medical + indemnity (splits across campers, pre-camp medical,
  consent_records)
- 02 Camper arrival check / assessment (the nurse day-one form, draft -> signed)
- 03 MedShack visit (note the repeating treatment table)
- 04 Near miss / medication event (exact nine event types + three factors, no invention)
- 05 Medications and treatments weekly grid (the medication grid mental model)
- 06 Crew medical check-in (crew-specific: broviac/port, blood count)
- 07 Crew indemnity

## wireframes/
Layout specs for the five screens that were wireframed. Structure, states, placement,
and the shared status-pill vocabulary. Build to these.

- 01 Camper profile (centrepiece, build first)
- 02 Arrival check (draft -> signed lock)
- 03 Near miss form (real taxonomy)
- 04 Home dashboard (every tile traces to a pain point)
- 05 Camp detail (the camp hub)

## Reading order for you, Claude Code
1. JFF_EHR_build_brief.md end to end (the why, the schema refinements, the build order).
2. Confirm the open FK decision (pre-camp medical: camper or registration).
3. This folder, per screen, as you build each one in the brief's priority order.
EOF
echo "index written"