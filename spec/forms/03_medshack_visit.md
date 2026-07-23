# Form spec: MedShack Visit

Source paper form: "MEDSHACK VISIT".
Filled by: nurse (and doctor sign-off) during camp, per clinical visit.
Maps to: medshack_visits (Tier 2, append-and-correct-only) + medshack_treatments
(repeating rows, append-only).
Form wins over the brief. No em dashes.

## Visit header -> medshack_visits
- Date
- Time
- Organisation name (constant: Just Footprints Foundation, prefill)
- Camper first name + family name (pulled from camper, not re-typed)
- Sex, age, DOB (pulled from camper)
- Name of person accompanying
- Group
- Reason for the visit

## Vitals -> medshack_visits
- Temperature
- Pulse
- Blood pressure
- Oxygen saturation (SpO2)

## Clinical -> medshack_visits
- Medical history
- Signs and symptoms
- Findings on examination

## Treatment given -> medshack_treatments (REPEATING TABLE, build "add row")
Each row has:
- Time
- Treatment
- Outcome

Do NOT build this as a single text box. It is a table with multiple rows. Append-only.

## Advice and report -> medshack_visits
- Advice to crew member accompanying the camper (two lines on the form; allow a list)
- Nursing report (multi-line free text)

## Sign-off
- Camp nurse signature -> nurse_id
- Camp doctor / nurse signature -> doctor_id (optional)
