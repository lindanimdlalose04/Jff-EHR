# Form spec: Medications and Treatments table (the weekly grid)

Source paper form: "Medications and Treatments" weekly grid.
This is the mental model behind the medication grid screen. It is how the nurse thinks
about a camper's meds: a week at a glance, not a chronological feed.
Maps to: prescriptions (the rows) + medication_doses (the cells).
Form wins over the brief. No em dashes.

## Header (per camper)
- Name (pulled from camper)
- Cabin (pulled from registration)
- Allergies: yes / no + detail (pulled from arrival check)
- Diagnoses (pulled from pre-camp medical)

## Grid structure
- Columns: the seven days, Sunday through Saturday, each with its date.
- Rows: each prescribed medication and its time(s).
- Cells: a scheduled dose. Recording it as given writes a medication_doses row stamped
  with administered_at and administered_by (this is the "electronically signs Gail gave
  it" requirement).
- Bottom row: one-time medications / report / comments.

## Dose states (drive the cell colour, reuse the shared pill vocabulary)
- given (success / green): administered_at set, status = given
- pending (muted): scheduled, time not yet reached
- missed (warning / amber): scheduled_at passed, status still scheduled. THIS IS THE ONE
  AUTO-FLAG THE CLIENT CONFIRMED. It must be automatic, not manual.

## Two views of the same data
- Per-camper grid: this weekly layout.
- Per-camp "today's rounds": a flat operational list of all doses due today across the
  camp, for running the medication round. Same underlying medication_doses rows.
