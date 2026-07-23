# Wireframe spec: Arrival check and medication check-in (draft -> signed)

Purpose: the nurse's day-one form. Fields from form spec 02. This screen is where the
draft -> signed lock lives. No em dashes.

## Header
- Title: "Arrival check and medication check-in".
- Subtitle: camper name, camp, "nurse-signed on day one".
- Right: status pill. While unsigned, amber "draft, editable" with a pencil icon.
  After signing, it flips to a locked/signed state (neutral or green "signed", with a
  lock icon), and edit affordances disappear.

## Body (matches form spec 02 field order)
- Allergies + eyesight side by side, then hearing, mobility aids, prosthesis, other.
- TB screening triplet as three checkboxes in a row: cough > 2 weeks, weight loss,
  night sweats.
- Medication handed in: yes/no + date, shown inline.
- Dietary and religion appear here but READ-ONLY (owned by pre-camp medical), visually
  muted so it is clear they are not edited here.

## Footer (the lock)
- Left: a quiet caption: "Signing locks this record. Later corrections show as
  amendments, never silent edits."
- Right: primary green button "Sign and lock" (signature icon).
- On click: writes status = signed, signed_at, signed_by; record becomes immutable;
  RLS blocks further UPDATE.

## After lock
- The whole form renders read-only.
- An "Amend" affordance replaces "Edit": amendments create a correction, never overwrite.
