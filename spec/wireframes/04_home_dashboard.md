# Wireframe spec: Home dashboard

Purpose: replace the thin current home (three stat boxes + two nav cards). Every tile
traces to a stated client pain point. Warmth is allowed; hospital-console density is not.
No em dashes.

## Greeting
- "Welcome back, [first name]".
- Subtitle: active camp name + "day X of Y".

## Top row (two tiles, 2:1 width)
### Today's rounds (wider tile)
- Header: "Today's rounds" + the dose time.
- List of doses due, each: status icon, camper + medication, and state on the right.
  - given: green check + "given HH:MM"
  - missed: amber alert + "missed, overdue"
  - pending: muted circle + "pending"
- Quiet caption: "Missed-dose flag = the one auto-alert Gail confirmed".

### Checked in (narrow tile)
- Big number "14 / 15".
- Caption: "Fixes the six-hour day-one bottleneck, shows what is pre-loaded".
- A thin progress bar.

## Bottom row (two equal tiles)
### Recent MedShack
- Last few visits: camper + short reason + time.
- Caption: '"Open their profile and see what is happening" (Gail)'.

### Active camp
- Camp name, province, dates, camper count, type.
- Link: "Open camp roster".

## Do not add
No hospital widgets (lab queues, bed boards, billing, etc.). Keep it a camp health
record. The four tiles above are the whole dashboard.
