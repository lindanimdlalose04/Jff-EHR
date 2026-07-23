# Wireframe spec: Camp detail (the camp hub)

Purpose: the operational hub for one camp episode. Everything clinical for THIS camp in
one place. This is the camp-local half of the architecture (the camper profile is the
persistent half). No em dashes.

## Header
- Camp name + status pill (active = green).
- Subtitle: province, dates, type, camper count.
- Right: "Edit camp" button (Tier 1, camps are fully editable).

## Stat row (four small tiles)
- Roster (count), Assessed (count), Doses today (count), Visits (count).

## Tabs (four, scoped to this camp)
1. Roster
2. Medication grid
3. MedShack
4. Incidents

## Roster tab (default)
- Caption: "Campers registered to this camp".
- Right: "Register camper" action (adds a camp_registration).
- Each row: avatar, name, cabin, and a status pill:
  - assessed (green): arrival check signed
  - draft (amber): arrival check started, not signed
  - no consent (red): no consent record, the acceptance gate
- Tapping a row opens that camper's profile / registration.

## Other tabs
- Medication grid: the per-camp view of the weekly grid (form spec 05).
- MedShack: this camp's visits (form spec 03).
- Incidents: this camp's near-miss events (form spec 04).

## Shared vocabulary note
The status pills reuse the exact same colour meanings as every other screen. A staff
member learns the colour language once. Do not invent camp-specific pill meanings.
