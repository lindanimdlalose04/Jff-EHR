# Form spec: Camper Medication Check-In and Assessment (the arrival check)

Source paper form: "CAMPER MEDICATION CHECK IN AND ASSESSMENT".
Filled and SIGNED by: the nurse / medical person, on arrival day (day one of camp).
Maps to: the arrival check table (new split table, Refinement A). Carries the
draft -> signed lock (Refinement B).
This form is the AUTHORITY for its fields. Form wins over the brief. No em dashes.

## Identity (not re-stored, pulled from camper)
- Name and surname
- DOB

## Assessment fields
- Allergies: yes / no, with free-text detail
- Eyesight (free text)
- Hearing (free text)
- Mobility aids (free text)
- Prosthesis (free text)
- Other (free text)

## Assistance with daily living (checkbox to enable section, then per-item free text)
- Shower / bath
- Dressing
- Toileting
- Eating

## TB screening triplet (each a checkbox with optional detail)
- A cough that lasts longer than 2 weeks
- Unexplained weight loss
- Night sweats or unexplained fevers

## Medication
- Medication: yes / no
- Medication handed in: yes / no
- Date (medication handed in)
- Current medication list (numbered, up to 5 on this form)

## Narrative
- Current physical condition (free text)
- Special dietary requirements (READ-ONLY, owned by pre-camp medical)
- Religion (READ-ONLY, owned by pre-camp medical)
- Additional camper information / history / suggestions / limitations
  (behavioural history, psychosocial needs, self-care needs)

## Sign-off (this is the lock)
- Medical person name (print)
- Medical person signature -> triggers status = signed, stamps signed_at + signed_by
- Date

Behaviour: editable while status = draft (amber pill). On signature, status = signed,
record locks, RLS blocks UPDATE. Later corrections are visible amendments only.
