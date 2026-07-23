# Wireframe spec: Camper profile (the centrepiece)

Purpose: the persistent record of a child across all camps. This is the head-office
longitudinal view. Build this FIRST. No em dashes anywhere.

## Header (always visible, above the tabs)
- Left: avatar (photo if present, else initials in a rounded green tile).
- Name (prominent) + file number pill (e.g. JFF-0401) beside it.
- Subtitle line: diagnosis, age, and sibling link if family_group_id is set
  (e.g. "linked to JFF-0406 (sibling)").
- Right: consent status. If no consent record for the child, show a red pill
  "consent missing" with a small alert icon. If consent on file, no pill or a quiet
  neutral one.

## Tabs (four, in this order)
1. Personal
2. Caregivers
3. Medical background
4. Camp history

## Tab 1: Personal (from registration form, Tier 1 full CRUD)
- Small caption under the tab: "Personal information, from registration form".
- Top-right of the panel: an "Edit" button (pencil icon). This tab is fully editable.
- Fields as a label/value table: date of birth, sex, language, t-shirt size, address.
- Photo is set/changed here.

## Tab 2: Caregivers
- Primary caregiver row(s) and emergency contact row(s).
- Inline add / edit / remove rows (Tier 1). Not a separate screen.
- Each row: name, cell, work number, relationship, primary flag.

## Tab 3: Medical background (from pre-camp medical table)
- Diagnosis, treating clinic/hospital + contact, hospital file number, viral load +
  dates, TB status, hepatitis B, adherence barriers, dietary, religion, disclosures,
  behavioural/psychosocial history.
- Editability depends on the pre-camp-medical FK decision and whether it is signed.

## Tab 4: Camp history (the persistent thread, the thesis point)
- A list of every camp this child has attended, newest first.
- Each row: tent icon, camp name and venue, month/year, and a status pill on the right
  (assessed = green, completed = neutral/muted).
- Each row links through to that camp's registration (its assessment, meds, visits).
- This is what makes "see a camper across camps" real. Do not omit it.

## Status pill vocabulary (shared across the whole app, do not reinvent per screen)
- assessed / given / on file: success, green
- draft: warning, amber
- missing / no consent / overdue: danger, red
- completed: neutral, muted
