# JFF EHR workflow guide

How the system is used, organised by the real tasks a JFF camp clinic carries
out rather than by screen. Each task lists the trigger at the NPO, the entry
point in the app, each step with what the user sees and does, what is written to
the database, where the app takes them next, and what becomes possible or stays
blocked and why.

Everything below is verified against the actual routes, role guards and
redirects in the code, not the brief. No em dashes are used. Spelling is UK /
South African.

## Roles and the guard model

There are exactly two roles, held in `users.role_permissions`: `medical` and
`admin`. Every signed-in user is one or the other. The guard works at three
layers:

- The UI hides or greys an action the current role may not perform.
- The API refuses the write with a 403 if the role is wrong, regardless of the
  UI.
- Row-level security in Postgres refuses it again at the database, even on a
  direct connection.

Who may write what:

- Administrative and demographic records (campers, caregivers, emergency
  contacts, camps, camp registrations, crew members, crew check-ins) can be
  maintained by any signed-in user, because both roles pass the medical-or-admin
  policy.
- Clinical records (pre-camp medical, arrival check, prescriptions, medication
  doses, MedShack visits and treatments, near-miss events, consent) require the
  medical role. An admin can often reach the form, but the save is refused with
  an inline message. This is deliberate: the client's rule is that everyone
  views and only the medical team edits.
- User management requires the admin role.

Every successful write also records an entry in the audit log, stamped with the
user who made it. This happens automatically on the server and needs no action
from the user.

A note on the clinical forms: the pre-camp medical form and the arrival check
form do not grey their save button for an admin. An admin can open them and fill
them in, but the save returns a 403 shown as a red inline message. The refusal
is real (server and database), it is simply surfaced on save rather than by a
disabled button.

## Signing in

Trigger: a staff member starts a shift, or opens the app for the first time.

Entry point: any URL. If not signed in, the app redirects to `/login` and
remembers where the user was heading.

Steps: the user enters their email and password. These are checked by Supabase
Auth, not by this application. On success the app returns them to the page they
first asked for, or to the home dashboard.

Blocked and why: a wrong password shows "Incorrect email or password". A user
with no active record in the system can authenticate but will not resolve to a
role, so protected data will not load.

## Task: add a new camper

Trigger: a social worker refers a child, and the registration pack comes in
before camp.

Entry point: Campers in the sidebar, then New camper. Route `/campers/new`.

Who: any signed-in user (campers are administrative, medical-or-admin).

Steps: the user fills the personal section from the registration form (first
name, surname, date of birth, sex, race, t-shirt size, language, cell, address)
and the JFF record fields (file number, longitudinal diagnosis, treating
clinic). Age is derived from the date of birth and not stored. The photo is a
URL for now.

Written: a row in `campers` via POST `/campers`.

Next: the app navigates to that camper's profile at `/campers/{id}`.

Unlocked: from the profile the user can add caregivers and emergency contacts
inline on the Caregivers tab (each an immediate save to `caregivers` or
`emergency_contacts`). The camper now exists as a persistent record but is not
yet attached to any camp.

Blocked and why: a duplicate file number is refused with "That file number is
already in use by another camper", because the file number is unique.

## Task: register a camper to a camp

Trigger: the camper is confirmed for a specific camp.

Entry point: Camps in the sidebar, open the camp, then Register camper on the
Roster tab. Route `/camps/{campId}/register`.

Who: any signed-in user (registrations are administrative).

Steps: the user picks a camper from a list that already excludes anyone
registered to this camp, and sets cabin, group, and status (registered, checked
in, attended, or cancelled).

Written: a row in `camp_registrations` via POST `/campregistrations`.

Next: the app returns to the camp hub, where the new camper appears on the
roster.

Unlocked: the registration is the hinge that every clinical record for this
camp hangs from. Consent, pre-camp medical, arrival check, prescriptions,
medication grid, MedShack visits, and near-miss events all attach to this
registration, so all of them become possible once it exists.

Blocked and why: the new roster row shows a red "no consent" pill. No child is
accepted to camp without a signed indemnity, so consent is the acceptance gate,
and the red pill is a link straight to consent capture.

## Task: capture consent

Trigger: the caregiver returns the signed indemnity and media release.

Entry point: the red "no consent" pill on a camp roster row, or the "No consent"
link on a camp history row of the camper profile. Route
`/registrations/{regId}/consent`.

Who: the medical team. An admin can open the page and see the records but the
capture form refuses to file.

Steps: the user reads the acceptance-gate warning, opens Capture consent, picks
a consent type (indemnity, media release, or medical treatment), enters who
signed, the witness, the location, and the date, optionally adds a URL to the
scanned document, and ticks the POPIA acknowledgement.

Written: a row in `consent_records` via POST `/consentrecords`.

Next: the page stays open and refreshes, the pill flips to "consent on file",
and the acceptance-gate warning clears.

Unlocked: on the camp roster the camper's pill moves off red "no consent" to the
assessment state, and the child is now accepted to camp.

Blocked and why: the File consent button stays disabled until POPIA is ticked,
because POPIA acknowledgement is the point of the record. A filed consent is
never edited; the only actions are to file another type or to withdraw one,
which is a soft delete, because consent is append-only.

## Task: capture pre-camp medical

Trigger: the caregiver's medical half of the registration pack arrives before
camp.

Entry point: the camper profile, Medical background tab, Capture pre-camp
medical (or Edit if one exists). Route `/registrations/{regId}/precamp`, targeted
at the camper's most recent registration.

Who: the medical team. An admin can open the form but the save is refused with
"Only the medical team may capture pre-camp medical information".

Steps: the user records the treatment context (diagnosis this cycle, hospital
file number, treating contact, clinical findings), the HIV, TB and hepatitis
block (viral load and its dates, TB history, hepatitis B, TB or OI history),
medication (up to four) and adherence, and care and background (dietary,
religion, disclosures, behavioural history).

Written: a row in `precamp_medicals` via POST, or an update via PUT, because the
pre-camp record stays editable in place (it has no signing lifecycle).

Next: the app returns to the camper profile on the Medical background tab, which
now shows the record and who captured it.

Unlocked: the arrival check will display the dietary and religion values from
here as read-only, because the pre-camp record owns them.

Blocked and why: there is one pre-camp record per registration. It is a clinical
record, so it is never hard-deleted, only soft-deleted.

## Task: do the arrival check and sign it

Trigger: day one of camp, the nurse works down the roster confirming each child
in person.

Entry point: the camper profile, Camp history row, Start arrival check (or
Continue, or View if signed). Route `/registrations/{regId}/arrival-check`.

Who: the medical team. An admin can open it but save, sign and amend are all
refused with "Only the medical team may complete arrival checks".

Steps while a draft: the pill reads "draft, editable". The nurse records
allergies, function and aids, the TB screening triplet, assistance with daily
living, medication and whether it was handed in, and the physical condition. The
dietary and religion fields are shown read-only from the pre-camp record. The
nurse can Save draft as many times as needed.

Written on save draft: a row in `arrival_checks` with status draft, via POST, or
an update via PUT while it stays a draft.

Signing: Sign and lock saves the current values then calls the sign endpoint,
which stamps `signed_at` and `signed_by` and sets the status to signed.

Written on sign: the same row flips to signed via POST `/arrivalchecks/{id}/sign`.

Next: the page stays open and re-renders as a locked, read-only view showing who
signed it and when. There is no redirect; the user goes back via Back to profile.

Unlocked: on the roster and the camp history the camper's pill turns green
"assessed". The home dashboard's checked-in count and the camp hub's assessed
count both move up.

Blocked and why: once signed, the record is read-only. There is no edit; the
only action is Amend. Amend soft-deletes the signed record as a visible
amendment and opens a fresh prefilled draft. Editing a signed record directly is
refused by the API with a 409 and by the database trigger independently, because
a signed clinical record may never be silently changed. This amend path is the
reason the arrival check table carries a partial unique index, so a retired
signed record and a new draft can coexist for the same registration.

## Task: prescribe medication

Trigger: the doctor or nurse sets up a child's medication schedule for the camp.

Entry point: the medication grid for a registration (camper profile, Camp
history row, Medications), then Prescriptions. Route
`/registrations/{regId}/prescriptions`.

Who: the medical team. The New prescription button is shown only to medical
users; an admin sees the list but no maintain actions.

Steps: the user enters the medication name, dose, route, frequency, the times of
day (which drive the grid), the start date, an optional end date, and notes.

Written: a row in `prescriptions` via POST.

Next: the prescription appears in the list with an amber "editable, no dose given
yet" pill, carrying Edit and Withdraw.

Unlocked: the medication grid and today's rounds now generate dose slots from
this prescription's times across its date range.

Blocked and why: this is the one hybrid in the two-tier model. Before any dose is
administered the prescription is fully editable. From the first administered
dose it locks: the Edit button disappears, the pill turns to "locked, N doses
given", and the only remaining action is Withdraw (a soft delete, always
allowed). An attempt to edit a locked prescription is refused by the API with a
409 and by the database trigger, because a medication a child has already been
given must not be silently altered. To correct a locked prescription the user
withdraws it and prescribes a replacement.

## Task: run a medication round

Trigger: a scheduled medication time during camp.

Entry point: Medications in the sidebar. Route `/medications`.

Who: the medical team. The Record buttons appear only for medical users; an
admin sees the round and its status but cannot record.

Steps: the round is grouped by time slot for the active camp, each row showing
camper, medication, cabin, and state. The nurse works down the list and presses
Record on each dose as it is given. There is also a per-camper weekly grid at
`/registrations/{regId}/medications` showing Sunday to Saturday, where a cell can
be recorded the same way.

Written: recording a dose writes a row in `medication_doses` with status given,
the administration time, and the administering crew member taken from the signed
in user. This is the electronic signature that the dose was given.

Next: the slot turns green and shows the time and who gave it. The counts on the
dashboard and the camp hub update.

Unlocked and automatic: a slot whose scheduled time has passed with no recorded
dose shows an amber "missed, overdue" flag. This is computed, not set by anyone,
and it is the one automatic alert the client asked for. The schedule itself is
computed from the prescription rather than stored, because a dose row is
append-only and a scheduled slot can never be turned into a given one.

Blocked and why: a medication dose is a fact once written and is never edited or
hard-deleted. Recording the first dose against a prescription also locks that
prescription (see the prescribing task).

## Task: log a MedShack visit

Trigger: a camper comes to the MedShack, for an injury, illness, or observation.

Entry point: MedShack in the sidebar, then New visit. Route `/medshack/new`.

Who: the medical team. The New visit button is shown only to medical users.

Steps: the user picks the camper from the active camp roster (which fills in sex,
age and date of birth from the record), records the date and time, reason and
person accompanying, the vitals (temperature, pulse, blood pressure, oxygen
saturation), the clinical notes (medical history, signs and symptoms, findings),
and one or more treatment rows in a repeating table (time, treatment, outcome).
Advice to the accompanying crew, the nursing report, and an optional doctor
countersignature complete the form.

Written: a row in `medshack_visits` via POST, then one row per treatment in
`medshack_treatments`, each appended to the visit and numbered by the server in
the order entered.

Next: the app returns to the MedShack list, where the new visit appears newest
first with its treatments.

Unlocked: from the list, a further treatment can be appended to an existing visit
without touching the visit record, because treatments are append-only rows.

Blocked and why: the visit and its treatments are clinical records. They are not
edited after the fact; a correction is a further appended record, and removal is
a soft delete only.

## Task: report a near miss or medication event

Trigger: a medication or treatment error or near miss happens and must be
recorded.

Entry point: Incidents in the sidebar, then Report an event. Route
`/incidents/new`.

Who: the medical team files the report. The Report an event button is shown only
to medical users; an admin sees the list and the empty state but cannot file.

Steps: the user picks the camper, records the date and time of the event and of
its discovery, ticks one or more of the nine initial impressions and any of the
three contributing factors (these are the exact options from the paper form, in
its order), writes the description and the immediate action taken, records
whether the doctor was notified, and either ticks "no treatment ordered" or
records the treatment ordered.

Written: a row in `medication_events` via POST. The impressions and factors are
stored in the form's own order, not the order they were ticked.

Next: the app returns to the incidents list, where the event appears with an
amber "awaiting review" pill and its impression tags.

The review step: a medical person opens Add review on the event, records the
investigation and corrective action plan, and signs it off.

Written on review: the same row gains the reviewer, the corrective action, and
the review time via POST `/medicationevents/{id}/review`. The pill turns green
"reviewed".

Blocked and why: a filed event is append-and-review-only. Nobody edits what was
filed. The review may be added exactly once and can never be rewritten. Both
rules are enforced by the API with a 409 and by the database trigger, so an
attempt to alter a filed event or overwrite a review is refused at the database
even on a direct connection.

## Crew equivalent: add a crew member

Trigger: a staff member or volunteer joins for a camp.

Entry point: Crew in the sidebar, then New crew member. Route `/crew/new`.

Who: any signed-in user (crew records are administrative, medical-or-admin). The
button is shown only to those users.

Steps: the user enters first name, surname, ID number, date of birth, role, and
an optional photo URL.

Written: a row in `crew_members` via POST.

Next: the app navigates to that crew member's detail page.

Blocked and why: a duplicate ID number is refused, because the ID number is
unique. Crew are their own world, not a variant of campers.

## Crew equivalent: crew medical check-in

Trigger: before camp, the medical leader checks each crew member in.

Entry point: the crew member's detail page, Check in (or Edit check-in). Route
`/crew/{crewId}/checkin`.

Who: medical or admin. The button is shown only to those users, and the save is
refused for anyone else.

Steps: the user records allergies, eyesight, hearing and mobility aids, the two
crew-specific flags that campers do not have (broviac or port, and blood count),
current medications, and the indemnity and medical release acknowledgement.

Written: a row in `crew_medical_checkins` via POST, or an update via PUT (crew
check-ins are operational and editable).

Next: the app returns to the crew member's detail page, showing the check-in
with the broviac and blood-count badges and the indemnity state. On the crew list
the member's status pill turns to "checked in", or to "indemnity outstanding" if
the release was not ticked.

Blocked and why: the crew indemnity here is the medical-release flag on the
check-in. A full separate crew indemnity record is specified and not built, as
noted in the build log.

## Task: manage user access

Trigger: a staff member's role changes, or someone leaves and their access must
be revoked.

Entry point: Admin in the sidebar. Route `/admin/users`. The Admin item is shown
only to admins.

Who: admins only. A medical user who reaches the route directly sees an "Admin
access required" panel and no data, and the API refuses the underlying calls.

Steps: the admin sees every user with their linked crew member, email, role and
active state. Make admin or Make medical changes the role; Deactivate or
Reactivate changes access. Both are immediate.

Written: a change to the `users` row via PUT `/users/{id}`.

Next: the row updates in place.

Blocked and why: an admin cannot change their own role or deactivate themselves,
so those buttons are absent on their own row. This prevents locking the last
administrator out. Creating a brand-new login is not possible here at all,
because a login is a Supabase Auth account that must be provisioned server-side
with the service key; the page explains this and new staff are added by the seed
or the Supabase dashboard, then managed here.

## A camper's state across a camp cycle

The camper moves through a sequence of states, shown by the roster pill and the
camp history pill. The pill follows a strict precedence, so the most important
thing to act on is always what is shown.

1. On file, not registered. The camper exists in `campers` with no registration.
   On the campers list they show "no registration". Nothing camp-specific is
   possible yet.
2. Registered, no consent. A `camp_registrations` row exists. The roster pill is
   red "no consent". This is the acceptance gate: consent outranks every other
   state, so even an assessed child shows red here until consent is on file.
3. Consent on file, not assessed. Once a consent record exists the pill becomes
   amber "not assessed". The child is accepted to camp and awaits the day-one
   check.
4. Arrival check in draft. Once the nurse starts and saves the arrival check the
   pill becomes amber "draft".
5. Assessed. Once the arrival check is signed the pill becomes green "assessed",
   and it locks.

Alongside this, the registration itself carries its own status (registered,
checked in, attended, cancelled), which is set at registration and can be edited,
and is shown as text rather than driving the pill. During camp the clinical
records accrue against the registration: pre-camp medical, prescriptions and
their doses, MedShack visits, and any near-miss events. After camp the
registration remains on the camper's persistent profile under Camp history, so
the next camp cycle starts with the full longitudinal record visible.

## Where the two-tier maintain model blocks an action

The model splits records into two tiers. Tier 1 is administrative data that is
fully editable. Tier 2 is clinical event data that is append-and-correct only,
never edited in place and never hard-deleted. The user meets this as follows.

- Tier 1 records (campers, caregivers, emergency contacts, camps, registrations,
  crew, crew check-ins) show an Edit action and can be changed freely.
- A signed arrival check shows no Edit. It is read-only with an Amend action.
  Editing it is refused by the API and the database.
- A prescription with an administered dose shows no Edit. It carries a Lock
  badge and only a Withdraw action. Editing it is refused by the API and the
  database. Before the first dose it is fully editable, which is the one hybrid
  case.
- A filed near-miss event is never editable. It carries an Add review action once
  and no more. Editing it or reviewing it twice is refused by the API and the
  database.
- A consent record shows no Edit. It carries only a Withdraw action, and POPIA
  must be ticked to file one.
- A MedShack visit and its treatments are not edited after the fact; a further
  treatment is appended instead.
- A medication dose is a fact once recorded, never edited, and the missed flag is
  computed rather than set.
- No clinical record is ever hard-deleted. A removal is a soft delete that keeps
  the row and marks who deleted it and when.

In every one of these cases the requirement behind the block is the same: a
clinical entry, once made, must not be silently changed, so corrections are
visible amendments and the guarantee is enforced at the database, not only in the
interface.
