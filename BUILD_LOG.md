# JFF EHR build log

Development record for the redesign and build of the JFF EHR artefact, covering
the work carried out against `JFF_EHR_build_brief.md` and the `spec/` folder.
It maps every screen and every database migration to its brief item and source
form, records what was verified and how, and documents the design findings and
deliberate deferrals. It is written to support the Chapter 4 design-science
narrative: several of the entries below are legitimate DSR design iterations
that emerged from returning to the source artefacts, not corrections of
mistakes.

No em dashes are used anywhere in this document, per the standing client
preference. Spelling is UK / South African.

## Stack and environment

- Frontend: React, Vite, TypeScript. Server state via TanStack Query, auth
  state via React Context, forms via React Hook Form and Zod, routing via React
  Router. Styling via Tailwind against the cream and teal design system in
  `styles/theme.css`.
- Backend: ASP.NET Core, EF Core, connecting directly to Postgres via Npgsql.
- Data and auth: Supabase (Postgres, Auth, Storage). The .NET tier connects to
  Postgres directly rather than through Supabase's data API, which is the
  documented two-backend arrangement.
- Runtime identity: Supabase Auth issues the JWT, the .NET tier validates it and
  carries the caller's id into Postgres as a session variable so row-level
  security and the audit trail resolve to a real person.

## Database schema iterations

Each migration below was scaffolded with EF Core, reviewed as SQL, and applied
to the live Supabase database using the owner connection. The runtime role
(`jff_api`) is a non-owner that cannot run DDL, which is the intended
separation: it holds only the privileges the running application needs, and
row-level security narrows those further.

| Migration | Date | What it does | DSR significance |
| --- | --- | --- | --- |
| InitialCreate | earlier | The 16-entity schema. | Foundation. |
| AddSecurityLayer | earlier | Row-level security on every table, immutability triggers on the clinical tables, append-only trigger on the audit log. | The defence-in-depth backstop. |
| SplitAssessmentAddRoleRls | 21 Jul | Refinement A and B plus the RLS and auth fix. | The core redesign, see below. |
| PartialUniqueClinicalRegistrationIndex | 22 Jul | Partial unique index (`WHERE deleted_at IS NULL`) on `precamp_medicals` and `arrival_checks`. | Makes the amend flow possible, see below. |
| PrescriptionDoseLock | 22 Jul | Replaces the blanket immutability trigger on `prescriptions` with a dose-conditional lock. | Matches the two-tier rule, see below. |
| MedicationEventReview | 22 Jul | Adds `no_treatment_ordered` and `reviewed_at`, and an append-and-review-only trigger. | Makes the review step possible, see below. |
| CrewBloodCount | 23 Jul | Adds `has_blood_count` to `crew_medical_checkins`. | Delivers the brief's crew-specific field. |

### Refinement A and B, and the RLS fix (SplitAssessmentAddRoleRls)

Returning to the source paper forms showed two separate medical intakes done by
two different people at two different times, which the single
`camper_assessments` table conflated. Refinement A split it into
`precamp_medicals` (the caregiver's pre-camp half) and `arrival_checks` (the
nurse's day-one check). The open decision on where the pre-camp record attaches
was confirmed with the client as the registration, so both attach to the
registration and the per-camp history is preserved. The overlap fields
(dietary, religion, disclosures) are owned by the pre-camp record; the arrival
check keeps its own additional-notes field because the check-in paper form
carries it (form wins over the brief, flagged).

Refinement B added a draft to signed lifecycle to the arrival check, with
`signed_at` and `signed_by`. It is fully editable while a draft and locks on
signing. A deviation was recorded here: the lock is enforced by a trigger rather
than in the RLS `UPDATE USING` clause, because soft-deleting a signed record
(the amend flow) is itself an update, so a blanket "no update once signed" RLS
rule would have blocked the amend path.

The RLS fix standardised identity on `app_current_user_id()` everywhere
(previously the audit log used `auth.uid()`), added an `app_user_role()` helper,
and made every policy role-aware: view is open to any authenticated user, but
clinical inserts and updates require the medical role, admin tables require
admin, and audit log reads go through the role helper. This is the change that
turns the view-versus-edit requirement from intended into enforced.

## Screen build log

Screens were built in the brief's priority order. Each was verified live against
the real Supabase database before moving on, by running a second backend
instance and a verify-mode frontend and signing in as the seeded users (Gail
Buys, medical; Lize van Vuuren, admin). Where a guarantee lives in the database,
it was also proved directly against the owner connection so it could not be
attributed to the API layer.

| # | Screen | Brief item | Source | Notes |
| --- | --- | --- | --- | --- |
| 1 | Camper profile | Priority 1.1 | Wireframe 01 | Tabbed persistent record: Personal, Caregivers (inline rows), Medical background, Camp history. Consent gate in header. |
| 2 | Camper create and edit | Priority 1.2 | Form 01 part 1 | Tier 1 full CRUD. Photo as a URL for now. |
| 3 | Pre-camp medical form | Priority 1.3 | Form 01 part 2 | The caregiver's medical half, per registration. |
| 4 | Arrival check | Priority 1.4 | Form 02, wireframe 02 | Draft to signed lock, amend flow. Surfaced the partial-index finding. |
| 5 | Medication grid and rounds | Priority 1.5 | Form 05 | Computed weekly grid and today's rounds. Automatic missed-dose flag. |
| 6 | Prescriptions maintain | Priority 1.6 | Brief 1.6 | Full CRUD before the first dose, locked after. Surfaced the dose-lock finding. |
| 7 | MedShack visit and list | Priority 1.7 | Form 03 | Repeating treatment rows, append-only, sequence numbered server-side. |
| 8 | Incident and near miss | Priority 2.8 | Form 04, wireframe 03 | Real nine-and-three taxonomy replacing the invented one. Review step. Surfaced the review-lock finding. |
| 9 | Camp hub | Priority 2.9 | Wireframe 05 | Header, stat row, four tabs scoped to the camp. Consent as the acceptance gate on the roster. |
| 10 | Camp registration | Priority 2.10 | Brief 2.10 | The hinge between persistent camper and camp episode. Built with screen 9. |
| 11 | Home dashboard | Priority 2.11 | Wireframe 04 | Four tiles, each tracing to a stated pain point. |
| 12 | Consent capture | Priority 2.12 | Form 01 part 3 | Append-only, POPIA required to file, acceptance gate surfaced on profile and roster. |
| 13 | Crew world | Priority 3.13 | Forms 06 and 07 | Crew list, CRUD, medical check-in with broviac and blood count. Indemnity gate. |
| 14 | Users admin | Priority 3.14 | Brief 3.14 | Role and active-status management, self-lockout guard, provisioning boundary. |

### Notes on the screens that produced findings

Screen 4, arrival check. The amend flow soft-deletes a signed record as a
visible amendment and inserts a fresh correction. This collided with the unique
index on `registration_id`, which was not filtered on `deleted_at`, so a
soft-deleted row permanently held the one-per-registration slot and every amend
returned a conflict. The fix was a partial unique index (see
PartialUniqueClinicalRegistrationIndex). Verified end to end, and at the database
level: a signed record retired by amendment coexists with the new draft, and
nothing is overwritten.

Screen 5, medication. Because `medication_doses` is append-only, a scheduled row
can never be flipped to given. The schedule is therefore computed from each
prescription's scheduled times, and a dose row is written only when an
administration is recorded. This makes the missed flag genuinely automatic (a
slot whose time has passed with no given row), which is the one auto-flag the
client confirmed. The immutability constraint forced the correct domain model.

Screen 6, prescriptions. The table was write-once from creation under the
blanket clinical trigger, and the controller had no update endpoint, which
contradicted the brief's rule of full CRUD before the first dose and locked
after. The blanket trigger was replaced with a dose-conditional lock (see
PrescriptionDoseLock): any change is refused once a dose has been administered,
withdrawal by soft delete is always allowed, hard delete never. Proved at the
database level as the owner: editing a prescription with administered doses is
rejected, editing one with none is accepted, and withdrawal of a locked one is
accepted.

Screen 8, incidents. The previous build carried an invented taxonomy (six
event types and six factors). The real paper form's exact nine initial
impressions and three contributing factors replaced it, in the form's order, and
the invented lists were removed from the codebase. The event could not be
reviewed at all (blanket trigger, no endpoint), contradicting the
append-and-review rule, so a review endpoint and an append-and-review-only
trigger were added (see MedicationEventReview): a filed event is never edited,
the review is added exactly once and never rewritten, and both facts are
enforced by the trigger.

Screen 9, camp hub. This absorbed screen 10, because the wireframe places both
the Edit camp and Register camper actions on the hub, and neither route existed.
Both were built, which is why camp registration (brief item 10) is complete.

## Cross-cutting finding

Three of the screens (4, 6, 8) surfaced the same category of issue: a blanket
immutability rule that was correct as a security backstop but blocked a workflow
the brief actually requires. In each case the resolution was to make the trigger
express the real rule rather than to relax it. The append-and-correct model of
the brief's Tier 2 is not simply "no writes"; it is a precise statement of which
one narrow change is allowed and when. Encoding that precisely at the database
level, so the guarantee holds even against a direct connection, is the strongest
security and ethics material in the artefact.

## Verification method

For each screen a second backend instance was run on a separate port against the
same live Supabase database, with a verify-mode frontend pointed at it, so the
user's own running instance was never disturbed. Verification signed in as the
real seeded accounts and exercised the real write paths, checking both the happy
path and the role gate (medical versus admin). Database-level guarantees
(immutability, the locks, the append-only rules) were additionally proved by
connecting as the schema owner, which bypasses row-level security, so the
guarantee could be attributed to the database and not to the application. Test
data created during verification was cleaned up afterwards, or left in place only
where it usefully demonstrates a real state and a seed re-run would clear it.

## Known limitations and deliberate deferrals

- Staff login creation is not done from the browser. A login is a Supabase Auth
  account whose id must match the users row, which needs the service key
  server-side. New staff are provisioned by the seed or the Supabase dashboard,
  then their role and access are managed in the admin screen. This is the
  deliberate boundary of the two-backend design, not a gap, and it is stated in
  the admin UI itself.
- Crew indemnity has no dedicated home in the schema. The crew indemnity paper
  form maps, per its spec, to consent records linked to crew, but the consent
  table's registration foreign key is for campers. The built version uses the
  crew check-in's medical-release flag as the indemnity gate. A full crew
  indemnity record (separable media release, POPIA, witness) is specified and
  not built, and would need a consent-table schema change.
- The crew medical check-in form carries the fields the entity supports plus the
  two crew-specific ones the brief names. The remaining form-06 fields (the TB
  screening triplet, the assistance-with-daily-living block, prosthesis, other
  comments) are specified and not built. This is Priority 3, deliberately
  partial, which the brief marks as an acceptable outcome.
- Scanned documents (consent, and crew or camper photos) are captured as URLs
  rather than uploaded to Supabase Storage. Real upload is the honest next step
  and is out of the demo's scope. The brief frames PDF exchange as a Google Docs
  integration, not an in-app portal.
- The camp hub makes several API calls per registration and is noticeably slower
  than the other screens on the session pooler. This is the two-backend
  arrangement showing its cost and is fixable with a purpose-built endpoint that
  returns the hub in one call. It is an optimisation, not a capability gap, and
  is worth doing before a live demo.

## Demo data and accounts

The database is seeded by a repeatable script that wipes the application tables
and reseeds inside one transaction, using the owner connection. It provisions
four staff with matching Supabase Auth accounts, users rows, and crew members
sharing one id per person, so a login resolves to a real person with a role. It
also seeds about fifteen invented, POPIA-safe campers across three camps with
caregivers, emergency contacts, registrations, consents, pre-camp medicals,
arrival checks, prescriptions, doses, and MedShack visits, so the screens read
as real when navigated. Passwords are random per run and printed at the end.

The four accounts are two medical (Gail Buys, Mbali Buthelezi) and two admin
(Lize van Vuuren, Riana Scheepers).

## Operations-side intake (admin registration import)

This section records work opened by the operations-side evaluation of mid August
2026. The artefact was walked through with the administrator (Lize van Vuuren),
alongside the domain expert (Sr Gail Buys). It was the first time an
operations / admin stakeholder, rather than a clinical one, evaluated the
system. Full narrative is in Chapter 4 thread C.

### The finding

As an EHR the system was received well ("almost perfect" for the clinical
workflow). The gap was on the operations side, and it traces to how the artefact
was informed: all prior feedback came from clinical staff, so the artefact
optimised the clinical workflow and under-served the operational workflow that
feeds it. The concrete bottleneck: no clinical record can begin until a child's
record exists in the system, and that capture is manual, one child at a time,
from paper forms that arrive late (often the morning of camp), for roughly fifty
new children per camp, done by one administrator. The system did not reduce that
data-entry load; it relocated it.

### The decision

- **Intake for this artefact is a Google Form plus an admin-only CSV import**, not
  a native intake portal. The form carries only form 01 Part 1 (identity,
  contact, logistics). Responses export to CSV and import into the EHR as draft
  camper, primary-caregiver and emergency-contact records for the administrator
  to review and confirm. Field-level authority and the CSV column order are in
  `spec/forms/08_public_registration_intake.md`.
- **A native in-app intake portal was considered and deliberately not adopted.**
  The longer-term direction is a separate open-source EHR effort (OpenMRS or a
  comparable stack, carrying this artefact's workflow and style forward), which
  places deeper operational integration beyond this artefact's boundary. This is
  a scope decision, not a capability limit.
- **The form is split by sensitivity, not convenience.** Part 2 medical data
  (diagnosis, viral load, TB and hepatitis history, medication) is paediatric HIV
  data and stays out of the public form on POPIA grounds; it remains captured
  inside the EHR by clinical staff. Part 3 indemnity and its signature stay on
  paper, scanned and uploaded as a PDF against the camper through the existing
  consent capture feature, because government-served and rural families cannot
  reliably sign electronically. The public form collects no signature.
- **No new role.** The import lives under the existing `admin` login. Both admin
  users (Lize and Riana) hold it and both get the feature. The two-role model
  (`medical`, `admin`) is unchanged.

### Status

- Form spec written (`spec/forms/08_public_registration_intake.md`), with a
  sample CSV to test the import (`spec/forms/sample_public_intake.csv`).
- CSV import feature: BUILT and both tiers compile clean. Migration APPLIED to
  the live database on 2026-08-16 and verified (see "Verification" below).
  - Backend: `pending_registrations` staging table (entity, DbContext config,
    migration `20260816062226_PendingRegistrations` with admin-only RLS), a
    dependency-free `CsvReader`, and an admin-gated `RegistrationIntakeController`
    with import, list-pending, confirm (promote to camper plus primary caregiver
    plus emergency contact) and discard.
  - Frontend: `/admin/intake` page (admin-gated) with CSV upload, a review queue
    of editable draft rows, duplicate and bad-date flags, and confirm or discard.
    New nav item "Intake" (admin only).
  - Design choices realised: a staging table (not a draft flag on `campers`), so
    unconfirmed data never touches the clinical tables. `Camper.FileNumber` is
    required but a Part 2 value not collected here, so confirm assigns a unique
    placeholder `INTAKE-xxxxxxxx` (surfaced for correction) unless the admin
    supplies a real one. `Caregiver.Relationship` defaults to "Parent / caregiver".
    T-shirt options are compact codes because `campers.t_shirt_size` holds 8 chars.
    Duplicate detection is on first name, surname and date of birth; a flagged row
    needs an explicit override to confirm, so a returning child is not re-created.
### Verification (2026-08-16)

The migration was applied through the privileged migrations role (`postgres`),
the same path every prior migration used, with `dotnet dotnet-ef database update`
and the `JffEhrDbMigrations` connection. Only this one migration was pending; it
is additive (a new table plus its policies and grants) and its Down drops only
that table, so no existing data was touched. Verified:

- Schema landed: `pending_registrations` exists with row level security enabled,
  28 columns, two indexes, the grant to `jff_api`, and the four admin-only
  policies with the expected `app_user_role() = 'admin'` clauses.
- RLS behaves, tested by connecting AS the real `jff_api` role inside a rolled-back
  transaction (no data persisted): with an admin identity set, INSERT, SELECT and
  UPDATE on the staging table all succeed; with a medical identity set, SELECT
  returns zero rows and INSERT is denied (Postgres 42501). This is the intended
  admin-only staging behaviour.
- The API boots clean against the migrated database, and the three intake
  endpoints are registered and auth-gated (401 unauthenticated, while a bogus
  route gives 404, so the gate is real).

Not yet done: the authenticated UI click-through (admin login, upload the sample
CSV, confirm a row, see the camper appear). It needs an admin password, which is
not held here, and it would create a real camper in the live evaluation database.
Recommended to run it against a local or throwaway database, or accept that the
promote step reduces to the same `jff_api` insert into `campers` that the existing
camper-create screen already performs and that RLS already permits for admins.

### Security and correctness review (2026-08-16)

A review pass over the new feature, with fixes applied and re-verified:

- **Unbounded import (fixed).** The import now caps a batch at 5000 data rows, so
  a very large or malformed file cannot exhaust memory or flood the shared
  database from one request.
- **Concurrent double-promote (fixed).** Two administrators confirming the same
  draft at once could each create a camper. Confirm now locks the staging row
  with `SELECT ... FOR UPDATE` inside a transaction; the second confirm blocks,
  then sees the row is no longer pending and is rejected. Verified against the
  live database as the `jff_api` role in a rolled-back transaction.
- **Byte order mark (fixed).** A surviving UTF-8 BOM on the export would have
  shifted every column by one silently. The CSV reader now strips a leading BOM.
  Verified: a BOM-prefixed sample parses to the correct 17 columns with the
  header intact and a comma-bearing address kept as one cell.
- **Missing identity (fixed).** Import now returns 401 if the request has no
  resolved user id, rather than stamping an empty importer.
- **Reviewed, no change needed.** SQL is parameterised throughout (EF Core;
  the confirm lock uses an interpolated `FromSql`, which parameterises); output
  is rendered by React, which escapes it; the endpoints are admin-gated at the
  API and again by row level security. There is no cookie auth, so CSRF does not
  apply.
- **Latent, noted for future work.** CSV formula injection is not exploitable
  today because no screen exports camper data to CSV or Excel (the only export
  is the medication-record PDF). If such an export is added, cells beginning with
  `= + - @` must be prefixed with an apostrophe. Duplicate detection loads the
  campers table into memory per import, which is fine at camp scale but worth
  revisiting if the roster grows large.
