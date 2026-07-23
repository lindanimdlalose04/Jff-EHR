# Form spec: Camper Registration + Medical Information + Indemnity

Source paper form: "Please complete the following information" (JFF Camp registration pack).
Filled by: primary caregiver, before camp, returned by the stated return date.
This form is the AUTHORITY for its fields. Where it disagrees with the build brief, this
form wins, and the discrepancy must be flagged.
No em dashes in any generated label or copy.

This paper form has three parts, and they map to different tables. Do not merge them.

## Part 1: Personal information -> `campers` table (Tier 1, full CRUD)

- Child's name (first name)
- Surname
- Date of birth
- Age (derive from DOB, do not store separately)
- Sex
- Race
- T-shirt size
- Address (multi-line)
- Cell number
- Language spoken

### Parent / primary caregiver -> `caregivers` table (is_primary = true)
- Name and surname
- Cell number
- Work number

### Emergency contact -> `emergency_contacts` table
- Contact person's name
- Cell number
- Work number
- Relationship to child (e.g. "Aunt")

## Part 2: Medical information (STRICTLY CONFIDENTIAL, filled by caregiver)
-> pre-camp medical table (the new split table, Refinement A)

- Child's full name and surname (identity, not re-stored)
- Diagnosis
- Clinic / hospital file number
- Clinic / hospital / doctor contact details where the child receives treatment
- Consent statement (free acknowledgement, signed by caregiver) -> consent_records
- Viral load over 1000 copies/ml: yes / no
- Latest VL: value in copies/ml
- Date test obtained
- Date received
- Clinical findings (free text)
- TB history: current / past / negative / on treatment (single select)
- Hepatitis B: yes / no
- TB and OIs history: yes / no, with detail (dates, diagnosis, treatment)
- Current medication list (numbered, up to 4 on this form)
- Adherence barriers: yes / no, with detail
- Special dietary requirements (diabetic, kosher, halaal, vegetarian, allergies, etc.)
- Camper's religious affiliation
- Additional information to disclose (free text)
- Additional camper information / history / suggestions / limitations
  (behavioural history, psychosocial needs, self-care needs e.g. bedwetting, sleepwalking)

Note: dietary_requirements, religion, additional_info also appear on the arrival check
form. Decision from the brief: pre-camp medical OWNS them, arrival check shows read-only.

## Part 3: Indemnity / media release -> consent_records (Tier 2, append-only, never deletable)

- Parent / caregiver full names
- Child full names
- Consent to attend, participate, travel (boolean acknowledgement)
- Media release: photo / video use (boolean, can be declined independently)
- POPIA acknowledgement (boolean)
- Signed at (location)
- Date signed (day, month, year)
- Legal guardian / parent name + signature
- Witness name + signature

Hard rule from the form: NO CHILD accepted to camp without a signed indemnity. The camper
profile and camp roster must surface consent status (red "no consent" pill when missing).
