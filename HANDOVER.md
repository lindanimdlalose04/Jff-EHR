# JFF EHR Project — Handover Document

> Drop this file in the project root as `HANDOVER.md`. It is the source-of-truth
> context for any agent (Claude Code, Codex) picking up the build. Read it
> alongside `ERD_FINAL1.drawio` and the existing `jff-ehr` frontend code.

## Who I am and what this is

Lindani Mdlalose, student number 46290303, BCom Honours in Informatics at
North-West University (NWU), Potchefstroom campus. Supervisor: Prof. J.
Liebenberg. Module: ITRI 671 (research project). Sole trader as YuppieTech.

### Working preferences (respect these in all output)

- No em dashes anywhere. Use commas, semicolons, or full stops.
- UK/SA English spellings (organisation, recognise, analyse).
- NWU Harvard referencing with a "Bibliography" heading, not "References".
- Scaffolding over ghostwriting; guidance, not writing done for me.
- Rubric-based marking with criterion-level scores when I ask; honest bands.
- Design before code; conceptual discussion before implementation.
- Push back directly when guidance is wrong; acknowledge errors clearly.
- Batch fixes rather than one-by-one corrections.
- Tight, direct responses without padding.
- C# confirmed; comfortable with Python, React/TypeScript, Azure, SQL.

## The research project

**Title:** Designing and evaluating an Electronic Health Record to enable
digital transformation in a paediatric oncology NPO.

**Research question:** How can an EHR system for a paper-based paediatric
oncology NPO be designed and implemented to bring about digital transformation?

**Methodology:** Design Science Research (DSR), Peffers et al. (2008) six-phase
model. Positivist paradigm with qualitative structured-interview data. Two-layer
trustworthiness framework: validity/reliability for the study overall, plus
Lincoln & Guba (1985) four criteria for the qualitative data.

**Grades so far:** Proposal 81%. Chapter 2 (Literature Review) 82%. Chapter 3
(Research Methodology) 80%. Target for dissertation: 85%+ distinction.

## The NPO — Just Footprints Foundation (JFF)

Johannesburg-based paediatric oncology NPO. Runs 6-10 camps a year across
Gauteng, Free State, Eastern Cape, Western Cape, KZN. Programmes: 3-5 day
residential camps, sibling camps, family weekends, hospital programmes, Care for
the Carer, Camp-On-The-Move (COTM, 80+ campers, likely a different workflow).
Patients: children with cancer, HIV, rare diseases, disabilities. US funder:
SeriousFun Children's Network.

**Current state:** Entirely paper-based. Files couriered between the JHB office
and camp venues. Some Excel for attendance, costs, medicines. ~4 PDFs per child.
Windows laptops, mostly reliable venue Wi-Fi, generators for loadshedding, no
tech budget.

**Access model (confirmed):** 4 users with system access (2 medical, 2 admin).
Medical-write-only for clinical entries. Immutable medical entries for legal
audit.

**Staff:** Sr Gail Buys (Chairman, oncology nurse), Sr Mbali Buthelezi (medical),
Ntombi Buthelezi (paramedic), Lize van Vuuren (Executive Camp Director), Riana
Scheepers (Community Liaison). The 4-vs-5 staff contradiction is a Round 2 gap.

## ERD — locked in (16 entities, 24 relationships)

Source of truth is `ERD_FINAL1.drawio`. Colour-coded by domain.

- **People & Users (blue):** CAMPER, CAREGIVER, EMERGENCY_CONTACT, CREW_MEMBER, USER
- **Camp Structure (green):** CAMP
- **Registrations & Consents (yellow):** CAMP_REGISTRATION, CONSENT_RECORD, CREW_MEDICAL_CHECKIN
- **Medical Operations (orange):** CAMPER_ASSESSMENT, PRESCRIPTION, MEDICATION_DOSE, MEDSHACK_VISIT, MEDSHACK_TREATMENT, MEDICATION_EVENT
- **System (gray):** AUDIT_LOG

### Key design decisions

- Camper is longitudinal; CampRegistration links a camper to a specific camp.
- Diagnosis and `family_group_id` (UUID, sibling linking, no junction table)
  live on Camper. Per-camp state is captured in assessments.
- Prescription and MedicationDose are separate (schedule vs actual admin).
- Clinical records are insert-only; all changes flow through AUDIT_LOG.
- User is a subset of CrewMember (one FK User to CrewMember).
- ConsentRecord per CampRegistration (each camp re-signs).
- HIV-specific fields are nullable on CamperAssessment (MVP, not a separate table).
- MedShackVisit has `nurse_id` (required) and `doctor_id` (nullable).
- MedShackTreatment is its own child entity (multiple per visit).

**Phase 2 candidates (not in current ERD):** VENUE, PARTNER_ORGANISATION,
DOCUMENT_ATTACHMENT, MEDICATION_CATALOGUE.

## Architecture — locked in

- **Frontend:** React 18 + Vite + TypeScript.
- **Backend:** ASP.NET Core Web API.
- **ORM:** Entity Framework Core.
- **DB + Auth + Storage:** Supabase (EU region, POPIA safeguards documented).
- **API style:** REST.
- **Dev hosting:** Railway (API) + Vercel (frontend), free tiers.
- **Prod path:** Azure App Service via Microsoft for Nonprofits credits.
- **Offline:** Best-effort online. No full offline sync. App detects offline,
  shows a yellow banner, disables writes, allows read of cached data,
  auto-refetches when back online.
- **Real-time:** Nice-to-have (Supabase Realtime), not required for MVP.

**Security, all four layers:** Supabase Auth (JWT) → ASP.NET Core RBAC → Postgres
RLS policies (defence in depth) → Postgres immutability triggers + append-only
AUDIT_LOG.

## Frontend — locked in

React Router v6. Server state: TanStack Query. Auth state: React Context. Form
state: React Hook Form + Zod. UI: shadcn/ui on Tailwind. HTTP: Axios with JWT
interceptor. Dates: date-fns. No Redux, no Zustand.

Folder pattern: `app/`, `features/{auth,campers,camps,medications,incidents,admin}/`,
`components/{ui,layout,forms}/`, `api/`, `lib/`.

### Routes

```
/login
/campers  ·  /campers/:id  ·  /campers/:id/history
/camps  ·  /camps/:id  ·  /camps/:id/registrations
/camps/:id/registrations/:regId/assessment
/camps/:id/registrations/:regId/medshack
/medications/schedule  ·  /medications/dose/:doseId
/incidents/new
/admin/users (admin only)  ·  /admin/reports (admin only)
```

## Design system — settled (this is new since the original handover)

Direction chosen: **OpenMRS O3 / Carbon-style single encounter form** (called
"Draft B" in discussion), with a pinned patient banner, section-grouped fields,
and conditional clinical blocks. Inspiration drawn pragmatically from OpenMRS,
Bahmni, GNU Health, and HospitalRun.

**Palette: light, warm cream with a teal accent.** Never hardcode hex in
components; colours live in `src/styles/theme.css` as CSS variables and are
surfaced as Tailwind utilities.

| Role    | Utility   | Meaning                          |
| ------- | --------- | -------------------------------- |
| accent  | `accent`  | teal, clinical, primary actions  |
| danger  | `danger`  | red, safety, HIV, alerts         |
| warning | `warning` | amber, pending, due              |
| admin   | `admin`   | purple, admin role               |
| neutral | `neutral` | gray, closed, inactive           |

Each has a `-tint` background variant (e.g. `bg-accent-tint text-accent`).

### Nine screens designed (as mockups)

Login, Camps list, Camp detail + registrations roster, CamperDetails hub (with
encounter timeline), Camper assessment, MedShack visit, Medication schedule,
Incident/medication-event form, Admin (users + reports). Together they exercise
every ERD entity and the confirmed access rules.

### Reusable component inventory (agreed vocabulary)

`AppHeader`, `PatientBanner` (with allergy slot), `TabStrip`, breadcrumb, the
search + count + primary-action toolbar, `FormSection` (default + danger tone),
`FormField`, the repeating-row table, the signature block, `StatusPill`
(success/warning/danger/neutral/admin), the encounter timeline item, stat cards,
roster rows, export tiles.

## Code built so far (the `jff-ehr` frontend)

Real, typechecked, runnable (`npm install && npm run dev`, mock API on by
default). Contains:

- **Theme layer:** `styles/theme.css`, `tailwind.config.ts`.
- **Shared components:** `Button`, `field` (input/textarea/select), `StatusPill`,
  `FormSection`, `FormField`, `AppHeader`, `OfflineBanner` (real online/offline
  events), `PatientBanner`.
- **Assessment vertical, end to end:** Zod schema (conditional HIV block via
  `superRefine`), mock/real API layer (`VITE_USE_MOCKS` toggle), TanStack Query
  hooks, the RHF form, the composing page. Insert-only by design: the API
  returns a server id and `signedAt`; there is no update endpoint.

The Assessment vertical is the **skeleton to clone** for the other screens: Zod
schema → API file (mock+real) → query/mutation hooks → form → page, reusing the
shared components.

### Known caveats to carry forward

- Layout is desktop / landscape-tablet first. Tables and multi-column grids need
  a stack-to-card fallback below ~640px before real mobile use at camp.
- The Axios client reads the JWT from localStorage as a placeholder; replace with
  a read from the Supabase auth context once auth is built.

## What is genuinely unfinished

1. **Backend does not exist yet.** ASP.NET Core API, EF Core entities for all 16
   ERD entities, Supabase Postgres schema, RLS policies, audit/immutability
   triggers, Supabase Auth wired to real JWTs. This is the biggest gap.
2. **Remaining frontend verticals** (MedShack, Incident, registration, list
   screens) — clones of the Assessment skeleton. MedShack holds the one new
   pattern: a repeating treatment-row table (`useFieldArray` + `z.array`) and
   dual nurse/doctor signature gating.
3. **Frontend to backend wiring** (`VITE_USE_MOCKS=false`, real auth, shape
   fixes).
4. **Deploy a thin slice early** (login → view camper → save assessment) on
   Railway + Vercel, before building everything.
5. **Round 2 interview** with Gail and Lize to close requirement gaps: baseline
   measurements, measurable success criteria, POPIA retention period, 4-vs-5
   staff, offline confirmation, COTM workflow, reporting/analytics scope,
   volunteer access boundaries, Lize's Excel structure.
6. **Evaluation** (the title says "and evaluating"): demonstration + evaluation
   cycle per DSR. As important for the mark as the build.
7. **Chapter 4** written alongside the build (Requirements Analysis, System
   Design, Implementation, Demonstration, Evaluation, Discussion, Conclusion),
   with a Sustainability plan section.

## Recommended build order for the backend (review between each layer)

1. ASP.NET Core Web API project + EF Core entity classes + DbContext for all 16
   entities. Insert-only for clinical records. No schema/RLS/auth yet.
2. Supabase Postgres schema + RLS policies + audit/immutability triggers.
   **Review this by hand; it is the security claim the dissertation makes.**
3. Supabase Auth wiring, real JWT issuance and validation, RBAC at the API layer.
4. Flip the frontend off mocks and wire it to the live API.
5. Deploy the thin slice.

Do not build all layers in one pass. One layer per prompt, review between.
