# Wireframe spec: Near miss / medication event form

Purpose: report a medication or treatment event. Fields and options from form spec 04.
The options are the authority; do not add or remove any. No em dashes.

## Header
- Title: "Medication / treatment event / near miss".
- Subtitle: "Append-only, reviewed by doctor, never editable once filed".

## Initial impression
- Caption: "Initial impression (from the actual form)".
- Nine checkboxes in a 3-column grid, in the form's order: Extra dose, Wrong dose,
  Wrong time, Wrong camper, Omission, Omission of dose, Wrong drug, Expired product,
  Wrong treatment.

## Contributing factors
- Caption: "Contributing factors (only three on the form)".
- Three checkboxes: Distractions, Workload, Cross coverage.

## Free-text and timing
- Date/time of event, date/time of discovery.
- Description of event.
- Immediate action taken.
- Notification of camp doctor.
- No treatment ordered (checkbox) + treatment ordered (text).

## Footer
- Left caption: reporter name, reviewing doctor (or "not yet reviewed").
- Right: primary green button "File report".
- Once filed: append-and-review-only. Reviewer adds review; the event is never edited.

## Contrast note for the developer
The old build had six invented event types and six invented factors. This replaces them
with the real nine + three. If you see the old taxonomy in the codebase, remove it.
