# Form spec: Medication / Treatment Event / Near Miss

Source paper form: "MEDICATION /TREATMENT EVENT/NEAR MISS FORM".
Filled by: reporter (nurse), reviewed and signed by medical person / doctor.
Maps to: medication_events (Tier 2, append-and-review-only, NEVER editable once filed).
Form wins over the brief. No em dashes.

CRITICAL: use these exact options, in this exact order, no additions, no omissions.
The previous build invented options. Do not repeat that. This form is the authority.

## Identity
- Camper name (pulled from camper)
- DOB (pulled)
- Cabin
- Primary Dx (diagnosis, pulled)

## Timing
- Date / time of event
- Date / time of discovery

## Description
- Description of event (free text)

## Initial impression (checkboxes, EXACTLY these nine, this order)
1. Extra dose
2. Wrong dose
3. Wrong time
4. Wrong camper
5. Omission
6. Omission of dose
7. Wrong drug
8. Expired product
9. Wrong treatment

## Contributing factors (checkboxes, EXACTLY these three, this order)
1. Distractions
2. Workload
3. Cross coverage

## Response
- Immediate action taken (free text)
- Notification of camp doctor (free text: who, when)
- No treatment ordered (checkbox)
- Treatment ordered (free text)

## Sign-off
- Name of reporter -> reporter_id
- Reporter signature
- Event investigation and corrective action plan (free text)
- Medical person -> reviewer_id
- Medical person signature

Once filed, this record is append-and-review-only. Reviewer can add the review; nobody
edits the filed event. Soft-delete only, never hard delete.
