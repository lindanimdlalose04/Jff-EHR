# Form spec: Public registration intake (parent / social worker facing)

Derived from: form 01 (Camper registration + medical + indemnity), Part 1 only.
Source of the pain point: the operations-side evaluation with the administrator (Lize van
Vuuren) and the domain expert (Sr Gail Buys), mid August 2026. See BUILD_LOG.md, section
"Operations-side intake", and Chapter 4 thread C.
No em dashes in any generated label or copy.

## Purpose

No clinical work can begin in the system until a child's record exists in it. Today that
capture is manual, one child at a time, from paper forms that arrive late (often the
morning of camp), for roughly fifty new children per camp, done by a single administrator.
This form moves the low-sensitivity part of that capture to the people who hold the
information (the caregiver, or a social worker assisting them), so it arrives as data
rather than as a stack of paper to retype.

The realised form is a Google Form. Its responses land in a Google Sheet, which the
administrator exports to CSV and imports into the EHR (admin only), where each response
becomes a DRAFT camper record for review and confirmation. The form itself is not part of
the .NET or React codebase; this spec is the authority for its fields and for the CSV
column order the importer expects.

## Scope boundary (read before building the form)

This form carries ONLY form 01 Part 1: identity, contact, and logistics. It deliberately
does NOT carry:

- **Part 2 medical information** (diagnosis, viral load, TB and hepatitis history,
  medication list, adherence, clinical findings). This is strictly confidential
  paediatric HIV data. It stays out of a public Google Form on POPIA and ethical grounds
  and remains captured inside the EHR by clinical staff at or before the medical check.
- **Part 3 indemnity / media release and its signature.** The signature stays on paper
  because government-served and rural families cannot reliably sign electronically
  (reaffirmed by the administrator as a non-goal). The signed one-pager is scanned and
  uploaded as a PDF against the camper, using the existing consent capture feature. This
  form collects no signature and needs none.

## Fields and the CSV column order

The Google Form questions must be created in exactly this order, so the exported CSV
columns line up with the importer. Google prepends a "Timestamp" column automatically;
the importer skips it. Required questions are marked; the rest may be left blank and
completed later in the EHR.

Property names below are the actual `Camper`, `Caregiver` and `EmergencyContact` entity
properties, verified against the entities, not the paper-form wording.

### Part A: the child (maps to `Camper`, Tier 1)

| # | Google Form question (label) | Type | Required | Maps to `Camper` |
|---|---|---|---|---|
| 1 | Child's first name | Short answer | Yes | FirstName |
| 2 | Surname | Short answer | Yes | Surname |
| 3 | Date of birth | Date | Yes | Dob |
| 4 | Sex | Multiple choice (Male, Female) | Yes | Sex |
| 5 | Race | Short answer | No | Race |
| 6 | T-shirt size | Multiple choice (see note) | Yes | TShirtSize |
| 7 | Home address | Paragraph | No | Address |
| 8 | Cell number | Short answer | No | CellNumber |
| 9 | Language spoken | Short answer | No | Language |

T-shirt size note: give fixed options rather than free text, so ordering by size is
possible and the guessing the administrator complained about is removed. Suggested option
set (confirm with the client): age 5 to 6, age 7 to 8, age 9 to 10, age 11 to 12, age 13
to 14, small adult, medium adult, large adult.

Age is not collected. It is derived from `Dob` in the EHR (form 01 rule: derive, do not
store).

`FileNumber` is required on `Camper` but is a Part 2 (clinical file) value and is NOT
collected here. The importer assigns a placeholder (for example, "INTAKE-PENDING") to
each draft, and the administrator or clinical staff set the real file number in the EHR
before or at the medical check. The review queue must surface this so a placeholder is
never mistaken for a real file number.

### Part B: primary caregiver (maps to `Caregiver`, IsPrimary = true)

| # | Google Form question (label) | Type | Required | Maps to `Caregiver` |
|---|---|---|---|---|
| 10 | Parent / primary caregiver name and surname | Short answer | Yes | Name |
| 11 | Caregiver cell number | Short answer | Yes | CellNo |
| 12 | Caregiver work number | Short answer | No | WorkNo |

`Caregiver.Relationship` is required by the entity but is not asked on the form for the
primary caregiver (the form 01 wording is simply "Parent / primary caregiver"). The
importer defaults it to "Parent / caregiver"; the administrator can correct it at review.

### Part C: emergency contact (maps to `EmergencyContact`)

| # | Google Form question (label) | Type | Required | Maps to `EmergencyContact` |
|---|---|---|---|---|
| 13 | Emergency contact name | Short answer | Yes | Name |
| 14 | Emergency contact cell number | Short answer | Yes | CellNo |
| 15 | Emergency contact work number | Short answer | No | WorkNo |
| 16 | Relationship to child (e.g. Aunt) | Short answer | Yes | Relationship |

## What the importer does with a row

1. Reads the CSV, skips the Timestamp column, maps the sixteen columns above.
2. Creates one DRAFT camper, one primary caregiver, and one emergency contact per row.
3. Does NOT register the child to a camp and does NOT create any clinical record. Camp
   registration, the pre-camp medical, the arrival check and consent remain deliberate
   in-EHR steps done by staff.
4. Surfaces the drafts in an admin review queue. The administrator confirms or corrects
   each one before it becomes a live camper. This preserves the human-in-the-loop control
   the administrator asked for, and matches the two-tier maintain model (Tier 1 records
   are created deliberately, not silently).
5. Flags likely duplicates (same first name, surname, and date of birth as an existing
   camper) so a returning child is not created twice. The persistent-camper design means a
   child is created once and re-registered to each later camp, never re-captured.

## Open confirmations (not blockers for creating the form)

- Confirm the T-shirt size option set with the client.
- Confirm whether "Sex" should offer any option beyond Male and Female for this cohort.
- The form has no camp selector. A single CSV import is assumed to be for one intake
  batch; the administrator chooses the target camp at review time, not the caregiver.
