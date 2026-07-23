# JFF EHR: redesign and build brief

Audience: Claude Code, acting as the implementing developer on this repo.
Author context: this is Lindani's ITRI 671 Honours dissertation artefact (NWU, Design
Science Research). The existing demo was largely built by you in prior sessions. This
brief tells you what changes, why, and in what order.

## Absolute rule, read first

No em dashes. Anywhere. Not in UI copy, not in code comments, not in commit messages,
not in generated docs, not in seed data, not in string literals. Use a comma, a colon,
a full stop, or parentheses instead. If you find existing em dashes anywhere in the
repo, remove them as you touch those files. This is a hard client preference, treat it
as a lint rule you enforce on yourself.

Other standing preferences: UK / South African English spelling (organisation,
paediatric, colour). Sentence case for all UI labels and headings. Design before code:
do not start a screen until its data shape and states are settled.

## Why we are shifting (do not skip this, it prevents you rebuilding the wrong thing)

The current demo drifted in two directions that the source data does not support, and
under-served the thing the data most asks for. We are correcting all three.

1. It leaned toward looking like a hospital EHR. The client (Sr Gail Buys, chair of the
   Medical Advisory Committee) explicitly and repeatedly said she does NOT want that.
   Her words: "this is Africa" not America with a full hospital on camp; an injury note
   "doesn't have to be like crazy detailed, just somewhere where you can type a note and
   save it"; the patient view should be like "starting a Facebook profile". Her single
   biggest requirement is "to not have paper" and to stop spending six hours writing
   notes on day one of camp. Target the artefact at that sentence: a paperless record
   for a travelling paediatric camp clinic run by four to five people on laptops. Not
   Epic. Not OpenMRS parity.

2. The incident form carried an invented taxonomy. It had event types and contributing
   factors that were made up from clinical-governance convention, not from the client's
   actual form. We now have the real paper form (see "Source forms"). The real
   vocabulary replaces the invented one exactly.

3. The most-described artefact in the interview data, the camper profile (the persistent
   record of a child across camps), did not exist as a screen. It becomes the
   centrepiece.

The architecture insight driving the redesign: the CAMPER is persistent, the CAMP is an
episode. Clinical work (medication rounds, MedShack visits, incidents) happens at the
camp. The longitudinal record (who this child is, their medical background, every camp
they have attended, their siblings) persists at head office. The old build was
camp-first only and lost the persistent half. We keep camp-first for clinical work and
ADD the persistent camper view.

## What is NOT changing

- Tech stack stays: React + Vite + TypeScript frontend, ASP.NET Core + EF Core backend,
  Supabase (Postgres, Auth, Storage). The marking rubric is stack-agnostic; do not
  migrate. The two-backend tension (Supabase auth vs a .NET tier) is documented as a
  known limitation in the dissertation, not fixed by a rewrite.
- The database schema stays as the foundation. It is good and it already answers most
  requirements. We make two targeted refinements (below), not a redesign.

## The two schema refinements (do these first, they change foreign keys downstream)

### Refinement A: split camper_assessments into two tables

Reason: the source paper forms show TWO separate medical intakes done by two different
people at two different times. The current single `camper_assessments` table conflates
them.

- Pre-camp medical (from the Camper Registration + Medical Information form, filled by
  the primary CAREGIVER, returned before camp). Carries: diagnosis, treating
  clinic/hospital and contact, hospital file number, viral load + test date + date
  received, TB status (current / past / negative / on treatment), hepatitis B, adherence
  barriers, clinical findings.
- Arrival check (from the Camper Medication Check-In and Assessment form, filled and
  SIGNED by the nurse on day one). Carries: allergies, eyesight, hearing, mobility aids,
  prosthesis, other, ADL needs (shower / dressing / toileting / eating), TB screening
  triplet (cough over 2 weeks, unexplained weight loss, night sweats), medication yes/no,
  medication handed in yes/no + date, current medications list (up to 5), physical
  condition.

Column mapping from the existing `camper_assessments`:
- To pre-camp medical: viral_load, vl_test_date, tb_status, hepatitis_b, adherence_barriers.
- To arrival check: allergies, eyesight, hearing, mobility_aids, prosthesis, adl_needs,
  symptom_flags, current_medications, medication_handed_in, physical_condition.
- Overlap fields present on BOTH paper forms: dietary_requirements, religion,
  additional_info. Decision: pre-camp medical OWNS these (source of truth); the arrival
  check screen displays them read-only, pulled from pre-camp medical.

OPEN DECISION you must confirm with Lindani before writing the migration: does the
pre-camp medical table attach to `camper` or to `registration`? Recommendation is
`registration` (viral load and TB status are re-declared each camp cycle, and the
history matters). Do not guess. Ask.

The arrival check attaches to `registration` (a child assessed at Camp 12 is
re-assessed at Camp 13).

### Refinement B: add a draft -> signed state to the arrival check

Reason: Gail pre-loads profiles the weekend before camp, then confirms in person on day
one. The pre-loaded state is a draft; the in-person nurse signature is the lock. This
also implements her legal requirement that medical entries, once made, cannot be edited.

- Add a status column to the arrival check table: `draft` or `signed`.
- Add `signed_at` and `signed_by`, distinct from the existing `assessed_at`.
- Behaviour: fully editable while `draft`. On sign, it locks. After lock, corrections are
  visible amendments (a new row, or a soft-delete with `deleted_by`), never silent edits.
- Enforce in RLS: no UPDATE once status is `signed` (add this to the USING expression).

Document A and B in the dissertation as DSR design iterations that emerged from returning
to the source artefacts. They are legitimate refinements, not corrections of mistakes.

## The organising rule for the whole build: two-tier maintain model

Every screen respects this split. It is the backbone of the redesign.

Tier 1, full CRUD (create, read, update, delete), administrative / demographic data:
campers, caregivers, emergency_contacts, camps, camp_registrations, crew_members, users,
and prescriptions BEFORE the first dose is administered. This is where the current demo
is thin; add the missing maintain screens here.

Tier 2, append-and-correct-only, no hard delete, clinical event data: arrival checks
(once signed), pre-camp medical (once signed if you add signing there too), medshack_visits,
medshack_treatments, medication_doses (an administered dose is a fact), medication_events,
consent_records. These already have `DELETE USING false` RLS. The UI must NOT offer a
delete button on these; it offers "amend", which writes a correction, and soft-delete only.

## RLS and auth fix (the security-relevant traceability hole)

Current state: every RLS policy is `app_current_user_id() IS NOT NULL`, which is
authentication only. Any logged-in user can edit anything. This contradicts the client's
explicit rule: everyone VIEWS, only the medical team EDITS ("only the Medical team is
authorized to complete tasks and make changes").

Two changes:
1. One identity mechanism. The clinical tables use `app_current_user_id()`; `audit_logs`
   uses `auth.uid()`. Standardise on `app_current_user_id()` everywhere. Rewrite the
   audit_logs admin-check policy to read the users table via that function.
2. Authorisation-aware policies. Add a helper (e.g. `app_user_role()`) returning the
   caller's `role_permissions`. Then: SELECT stays open to any authenticated user
   (everyone views). INSERT / UPDATE on clinical tables require the role to be in a
   medical set. Admin-tier tables editable by admin / coordinator roles per
   `role_permissions`.

This single change makes the view-vs-edit requirement ENFORCED, not merely intended. It
is the strongest POPIA / ethics paragraph in the dissertation, so implement it cleanly.

## Screen inventory and build order

Build order protects the deadline (Chapter 4 due 17 August). Build the camper-and-
medication spine first. If time runs short, the LATER items are the ones to leave as
"designed and specified, partially built", which is an acceptable DSR outcome.

Priority 1, the spine (build first, in this order):
1. Camper profile (centrepiece). Tabbed persistent record: Personal, Caregivers +
   emergency contacts (inline add/edit rows), Medical background (from pre-camp medical),
   Camp history (every registration as a row, linking to that camp's assessment / meds /
   visits; siblings via family_group_id shown as linked profiles). Photo lives on
   Personal, used for ID. Show a red "consent missing" badge if no consent record.
   Wireframe exists; match it.
2. Camper create / edit form (Tier 1 full CRUD). Fields from the registration form.
3. Pre-camp medical form (the new split table). Caregiver's medical half.
4. Arrival check form (draft -> signed, the lock lives here). Fields from the check-in
   form. Wireframe exists; match it. Amber "draft, editable" pill flips to locked/signed.
5. Medication grid per camper (renders the weekly Sun-Sat grid from the Medications and
   Treatments paper form) + today's rounds per camp (flat operational list). Recording a
   dose writes a medication_doses row stamped with who and when. Missed dose = scheduled
   time passed, status still scheduled -> amber flag. This is the one auto-flag the
   client confirmed.
6. Prescriptions maintain screen (full CRUD before first dose, locked after).
7. MedShack visit list + visit form. Fields map to medshack_visits (reason, accompanied
   by, vitals temp/pulse/BP/SpO2, medical history, signs and symptoms, findings). The
   treatment section is a REPEATING table (time / treatment / outcome rows =
   medshack_treatments, append-only), so build "add treatment row", not a single text
   box. Advice-to-crew (two lines), nursing report, nurse + doctor signature.

Priority 2:
8. Incident / near-miss report. Rebuild to the REAL taxonomy from the paper form. Event
   types, exactly these nine, in this order, no additions: Extra dose, Wrong dose, Wrong
   time, Wrong camper, Omission, Omission of dose, Wrong drug, Expired product, Wrong
   treatment. Contributing factors, exactly these three: Distractions, Workload, Cross
   coverage. Plus: date/time of event, date/time of discovery, description, immediate
   action, doctor notification, "no treatment ordered" checkbox, treatment ordered,
   reporter + signature, investigation / corrective plan, medical-person sign-off.
   Append-and-review-only. Wireframe exists; match it.
9. Camp detail (the camp hub). Header with camp number, venue, dates, type, status.
   Stat row (roster, assessed, doses today, visits). Four tabs scoped to THIS camp:
   Roster, Medication grid, MedShack, Incidents. Roster rows show status pills
   (assessed / draft / no consent) reusing the same colour vocabulary as everywhere
   else. Wireframe exists; match it.
10. Camp registration (assign camper to camp: cabin, group, status). The hinge between
    persistent camper and camp episode. Auto-populates the med grid header from the
    profile, no re-typing.
11. Home dashboard rebuild. Tiles, each traces to a stated pain point: today's rounds
    with missed-dose flags, assessment progress ("14 of 15 checked in", fixes the
    six-hour bottleneck), recent MedShack activity, active camp anchor. Warmth is allowed
    (greeting, progress bar, JFF green) but do NOT add hospital widgets. Wireframe exists;
    match it.
12. Consent capture (per registration): consent_type, signed_by, witness, POPIA
    acknowledged, optional uploaded scanned PDF to document_url. Append-only, never
    deletable. Profile and roster show whether consent is on file.

Priority 3 (leave partial if time is tight):
13. Crew list + crew medical check-in (has broviac/port and blood-count fields campers
    lack) + crew indemnity. Parallel to campers, NOT a reskin; crew are their own world.
14. Users / admin (create staff, set role_permissions, deactivate). Minimal, but needed
    for the RBAC story to be real.

## Explicit non-goals (traced restraint, do not build these)

- No public parent-facing self-service application portal. Recruitment goes through
  social workers via Google Docs; the client said "you can't just rock up". Import/export
  of PDFs to Google Docs is the integration, not a portal.
- No live hospital-system integration. Client: "too many changing factors".
- No chemo / intensive-treatment modelling. Out of scope by the client's account.
- No print pipeline. Client: "why are you giving option for more papers".

Each omission is a defended design decision. If you think one is needed, ask before
building it.

## Design system notes

- JFF green as the accent (the existing demo already uses it).
- Status pill vocabulary is shared across all screens so staff learn it once: assessed
  (success/green), draft (warning/amber), no consent / missing (danger/red), completed
  (neutral/muted). Reuse consistently; do not invent per-screen colour meanings.
- Keep it learnable on the go. The client said a new volunteer should understand it
  without a training session and it "shouldn't be too much of a struggle". Favour clarity
  over density.

## Source forms (the field-level authority)

Seven JFF paper forms are the spec for form fields. Where a form and this brief disagree
on a field name or option, the FORM wins, and flag the discrepancy. The forms:
Camper Registration + Indemnity + Medical Information; Camper Medication Check-In and
Assessment; Crew Indemnity; Medical Check-In Crew; Medications and Treatments table;
Medication/Treatment Event/Near Miss form; MedShack Visit. Do not invent fields the
forms do not contain, and do not omit fields they do.

## First actions for you, Claude Code

1. Confirm the one open decision: pre-camp medical attaches to camper or registration.
2. Write migrations for Refinement A and B. Do not touch other tables.
3. Apply the RLS / auth fix.
4. Then build Priority 1 screens in order, starting with the camper profile.
5. Strip any em dashes you encounter. Enforce no-em-dash in everything you generate.
