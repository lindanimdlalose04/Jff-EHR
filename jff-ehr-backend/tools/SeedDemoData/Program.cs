using System.Security.Cryptography;
using Npgsql;
using System.Text.Json;

// ============================================================================
// JFF EHR demo seed script. Repeatable: each run WIPES all application tables
// (plus the four demo auth accounts) and reseeds from scratch, inside one
// transaction. Uses the owner connection (ConnectionStrings:JffEhrDbMigrations)
// because seeding writes across every table, including trigger-protected ones
// (TRUNCATE does not fire the per-row immutability triggers).
//
// Auth <-> table sync: each staff member's UUID is generated ONCE here and
// written as BOTH auth.users.id and public.users.user_id. The login JWT's
// `sub` claim is therefore exactly the value the API's claims transformation
// uses to find the users row (role + crew link). Passwords are random per run
// and printed at the end.
//
// All camper data is invented (POPIA-safe); no real patient information.
// ============================================================================

var secretsPath = Path.Combine(
    Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
    "Microsoft", "UserSecrets", "2a6c0eb3-edd4-4cd9-8a80-80eebe2d8589", "secrets.json");
var secrets = JsonDocument.Parse(File.ReadAllText(secretsPath));
var ownerConnString = secrets.RootElement.GetProperty("ConnectionStrings:JffEhrDbMigrations").GetString()!;
var apiConnString = secrets.RootElement.GetProperty("ConnectionStrings:JffEhrDb").GetString()!;

string NewPassword()
{
    const string alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!#%+";
    return new string(RandomNumberGenerator.GetItems<char>(alphabet, 16));
}

await using var db = new NpgsqlConnection(ownerConnString);
await db.OpenAsync();
await using var tx = await db.BeginTransactionAsync();

async Task Exec(string sql, params (string Name, object? Value)[] ps)
{
    await using var cmd = new NpgsqlCommand(sql, db, tx);
    foreach (var (name, value) in ps) cmd.Parameters.AddWithValue(name, value ?? DBNull.Value);
    await cmd.ExecuteNonQueryAsync();
}

Console.WriteLine("=== JFF EHR demo seed ===\n");

// ---------------------------------------------------------------------------
// Staff: 4 login users. Same GUID goes to auth.users.id AND users.user_id.
// ---------------------------------------------------------------------------
var staff = new[]
{
    new Staff(Guid.NewGuid(), Guid.NewGuid(), "Gail", "Buys", "gail.buys@jffdemo.org", "nurse", "medical", NewPassword()),
    new Staff(Guid.NewGuid(), Guid.NewGuid(), "Mbali", "Buthelezi", "mbali.buthelezi@jffdemo.org", "doctor", "medical", NewPassword()),
    new Staff(Guid.NewGuid(), Guid.NewGuid(), "Lize", "van Vuuren", "lize.vanvuuren@jffdemo.org", "camp admin", "admin", NewPassword()),
    new Staff(Guid.NewGuid(), Guid.NewGuid(), "Riana", "Scheepers", "riana.scheepers@jffdemo.org", "camp admin", "admin", NewPassword()),
};
var gail = staff[0];
var mbali = staff[1];
var lize = staff[2];

// ---------------------------------------------------------------------------
// WIPE (repeatability). TRUNCATE fires no per-row triggers, so the clinical
// immutability triggers do not block a full demo reset. Auth demo accounts are
// removed by email; auth.identities rows cascade.
// ---------------------------------------------------------------------------
Console.WriteLine("Wiping application tables and previous demo auth accounts...");
await Exec("""
    truncate table
        audit_logs, medication_events, medication_doses, prescriptions,
        medshack_treatments, medshack_visits, precamp_medicals, arrival_checks,
        consent_records, crew_medical_checkins, camp_registrations,
        caregivers, emergency_contacts, campers, camps, users, crew_members
    cascade
    """);
await Exec("delete from auth.users where email = any(@emails)",
    ("emails", staff.Select(s => s.Email).ToArray()));

// ---------------------------------------------------------------------------
// Supabase Auth accounts (direct inserts as owner). GoTrue verifies bcrypt
// hashes produced by pgcrypto's crypt(..., gen_salt('bf')). The empty-string
// token columns prevent GoTrue null-scan errors on login.
// ---------------------------------------------------------------------------
Console.WriteLine("Creating Supabase Auth accounts + crew_members + users rows...");
foreach (var s in staff)
{
    await Exec("""
        insert into auth.users (
            instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
            confirmation_token, recovery_token, email_change, email_change_token_new,
            email_change_token_current, phone_change, phone_change_token, reauthentication_token
        ) values (
            '00000000-0000-0000-0000-000000000000', @id, 'authenticated', 'authenticated',
            @email, extensions.crypt(@pw, extensions.gen_salt('bf')), now(),
            '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
            '', '', '', '', '', '', '', ''
        )
        """, ("id", s.UserId), ("email", s.Email), ("pw", s.Password));

    await Exec("""
        insert into auth.identities (
            id, user_id, provider_id, identity_data, provider,
            last_sign_in_at, created_at, updated_at
        ) values (
            gen_random_uuid(), @id, @id::text,
            jsonb_build_object('sub', @id::text, 'email', @email, 'email_verified', true),
            'email', now(), now(), now()
        )
        """, ("id", s.UserId), ("email", s.Email));

    await Exec("""
        insert into crew_members (crew_id, name, surname, id_number, role, created_at)
        values (@crew, @name, @surname, @idnum, @role, now())
        """,
        ("crew", s.CrewId), ("name", s.Name), ("surname", s.Surname),
        ("idnum", $"DEMO-{s.Name.ToUpperInvariant()}-{s.CrewId.ToString()[..6]}"), ("role", s.Role));

    await Exec("""
        insert into users (user_id, crew_id, email, password_hash, role_permissions, is_active, created_at)
        values (@user, @crew, @email, 'managed-by-supabase-auth', @perm, true, now())
        """,
        ("user", s.UserId), ("crew", s.CrewId), ("email", s.Email), ("perm", s.Permission));
}

// ---------------------------------------------------------------------------
// Camps: one completed, one currently running, one planned.
// ---------------------------------------------------------------------------
Console.WriteLine("Creating camps...");
var campPast = Guid.NewGuid();
var campActive = Guid.NewGuid();
var campPlanned = Guid.NewGuid();
var camps = new (Guid Id, int Number, string Start, string End, string Venue, string Province, string Type, string Status)[]
{
    (campPast, 12, "2025-12-05", "2025-12-11", "Camp Kwalata, Dinokeng", "Gauteng", "oncology", "completed"),
    (campActive, 13, "2026-07-10", "2026-07-16", "Bergkroon, Paarl", "Western Cape", "oncology", "active"),
    (campPlanned, 14, "2026-12-04", "2026-12-10", "Sondela Nature Reserve, Bela-Bela", "Limpopo", "family", "planned"),
};
foreach (var c in camps)
{
    await Exec("""
        insert into camps (camp_id, camp_number, start_date, end_date, venue, province, camp_type, status, created_at)
        values (@id, @num, @start::date, @end::date, @venue, @prov, @type, @status, now())
        """,
        ("id", c.Id), ("num", c.Number), ("start", c.Start), ("end", c.End),
        ("venue", c.Venue), ("prov", c.Province), ("type", c.Type), ("status", c.Status));
}

// ---------------------------------------------------------------------------
// Campers: 15 invented children, 3 sibling pairs, varied clinical pictures.
// ---------------------------------------------------------------------------
Console.WriteLine("Creating campers, caregivers, emergency contacts...");
var famMokoena = Guid.NewGuid();
var famMolefe = Guid.NewGuid();
var famNdlovu = Guid.NewGuid();

var campers = new Kid[]
{
    new("Thabo", "Mokoena", "2016-08-14", "M", "Sesotho", "Acute lymphoblastic leukaemia", "Chris Hani Baragwanath", "JFF-0401", famMokoena, "Penicillin", true, "Naledi Mokoena (mother)", "071 555 0101"),
    new("Lerato", "Mokoena", "2018-11-02", "F", "Sesotho", "Wilms tumour", "Chris Hani Baragwanath", "JFF-0402", famMokoena, null, false, "Naledi Mokoena (mother)", "071 555 0101"),
    new("Sipho", "Dlamini", "2014-03-27", "M", "isiZulu", "B-cell lymphoma", "Inkosi Albert Luthuli", "JFF-0403", null, null, true, "Zodwa Dlamini (grandmother)", "072 555 0102"),
    new("Anele", "Khumalo", "2017-06-09", "F", "isiZulu", "Nephroblastoma", "Grey's Hospital", "JFF-0404", null, "Elastoplast (adhesive)", false, "Sibongile Khumalo (mother)", "073 555 0103"),
    new("Kagiso", "Molefe", "2015-09-21", "M", "Setswana", "Osteosarcoma (right leg, above-knee amputation)", "Steve Biko Academic", "JFF-0405", famMolefe, null, false, "Tumelo Molefe (father)", "074 555 0104"),
    new("Naledi", "Molefe", "2019-04-17", "F", "Setswana", "Retinoblastoma (left eye enucleated)", "Steve Biko Academic", "JFF-0406", famMolefe, null, false, "Tumelo Molefe (father)", "074 555 0104"),
    new("Priya", "Naidoo", "2013-12-05", "F", "English", "Hodgkin lymphoma", "Inkosi Albert Luthuli", "JFF-0407", null, "Latex", false, "Kamala Naidoo (mother)", "075 555 0105"),
    new("Dewald", "Botha", "2016-10-30", "M", "Afrikaans", "Medulloblastoma", "Tygerberg Hospital", "JFF-0408", null, null, false, "Elmarie Botha (mother)", "076 555 0106"),
    new("Chloe", "Adams", "2015-05-12", "F", "English", "Acute myeloid leukaemia", "Red Cross Children's", "JFF-0409", null, "Sulphonamides", false, "Charlene Adams (mother)", "077 555 0107"),
    new("Junaid", "Abrahams", "2012-07-19", "M", "Afrikaans", "Ewing sarcoma", "Red Cross Children's", "JFF-0410", null, null, false, "Faried Abrahams (father)", "078 555 0108"),
    new("Zanele", "Ndlovu", "2018-02-08", "F", "isiZulu", "Acute lymphoblastic leukaemia", "Charlotte Maxeke", "JFF-0411", famNdlovu, null, true, "Thandi Ndlovu (mother)", "079 555 0109"),
    new("Bongani", "Ndlovu", "2015-01-25", "M", "isiZulu", null, "Charlotte Maxeke", "JFF-0412", famNdlovu, null, false, "Thandi Ndlovu (mother)", "079 555 0109"),
    new("Emma", "van Rensburg", "2017-08-03", "F", "Afrikaans", "Rhabdomyosarcoma", "Universitas Academic", "JFF-0413", null, "Tree nuts", false, "Ansie van Rensburg (mother)", "071 555 0110"),
    new("Lwazi", "Mthembu", "2013-11-16", "M", "isiXhosa", "Astrocytoma (low grade), epilepsy", "Frere Hospital", "JFF-0414", null, null, false, "Nomvula Mthembu (mother)", "072 555 0111"),
    new("Refilwe", "Sithole", "2016-04-28", "F", "Sepedi", "Neuroblastoma", "Polokwane Provincial", "JFF-0415", null, null, false, "Mapula Sithole (grandmother)", "073 555 0112"),
};

foreach (var k in campers)
{
    await Exec("""
        insert into campers (camper_id, first_name, surname, dob, sex, language, t_shirt_size,
                             diagnosis, treating_clinic, file_number, family_group_id, created_at, updated_at)
        values (@id, @first, @sur, @dob::date, @sex, @lang, @shirt, @diag, @clinic, @file, @fam, now(), now())
        """,
        ("id", k.Id), ("first", k.First), ("sur", k.Surname), ("dob", k.Dob), ("sex", k.Sex),
        ("lang", k.Language), ("shirt", "S"), ("diag", k.Diagnosis), ("clinic", k.Clinic),
        ("file", k.FileNo), ("fam", k.FamilyGroup));

    await Exec("""
        insert into caregivers (caregiver_id, camper_id, name, cell_no, relationship, is_primary, created_at)
        values (gen_random_uuid(), @camper, @name, @cell, @rel, true, now())
        """,
        ("camper", k.Id), ("name", k.CaregiverName.Split(" (")[0]), ("cell", k.CaregiverCell),
        ("rel", k.CaregiverName.Split('(', ')')[1]));

    await Exec("""
        insert into emergency_contacts (contact_id, camper_id, name, cell_no, relationship, created_at)
        values (gen_random_uuid(), @camper, @name, @cell, @rel, now())
        """,
        ("camper", k.Id), ("name", "After-hours: " + k.CaregiverName.Split(" (")[0]),
        ("cell", "060 555 0" + Random.Shared.Next(100, 999)), ("rel", "family"));
}

// ---------------------------------------------------------------------------
// Registrations + consent records.
//   Camp 13 (active):   campers 0-9, checked in.
//   Camp 12 (completed): campers 0,2,4,6,8,10,12,14 (longitudinal history).
//   Camp 14 (planned):  campers 10-14, registered.
// ---------------------------------------------------------------------------
Console.WriteLine("Creating registrations and consent records...");
var regs = new Dictionary<(Guid Camp, Guid Camper), Guid>();

async Task Register(Guid campId, Kid k, string status, string registeredAt, string cabin)
{
    var regId = Guid.NewGuid();
    regs[(campId, k.Id)] = regId;
    await Exec("""
        insert into camp_registrations (registration_id, camp_id, camper_id, cabin, status, registered_at)
        values (@id, @camp, @camper, @cabin, @status, @at::timestamptz)
        """,
        ("id", regId), ("camp", campId), ("camper", k.Id), ("cabin", cabin),
        ("status", status), ("at", registeredAt));

    await Exec("""
        insert into consent_records (consent_id, registration_id, consent_type, signed_by, witness_name,
                                     signed_at, signed_location, popia_acknowledged)
        values (gen_random_uuid(), @reg, 'medical_treatment', @signer, @witness, @at::timestamptz, 'Registration desk', true)
        """,
        ("reg", regId), ("signer", k.CaregiverName), ("witness", "Lize van Vuuren"), ("at", registeredAt));
}

for (var i = 0; i < 10; i++)
    await Register(campActive, campers[i], "checked_in", "2026-06-15 09:00+02", i % 2 == 0 ? "Lions" : "Eagles");
foreach (var i in new[] { 0, 2, 4, 6, 8, 10, 12, 14 })
    await Register(campPast, campers[i], "attended", "2025-11-10 09:00+02", "Kudu");
for (var i = 10; i < 15; i++)
    await Register(campPlanned, campers[i], "registered", "2026-07-01 09:00+02", "TBC");

// ---------------------------------------------------------------------------
// Refinement A split: a pre-camp medical (the caregiver's half) for every
// active and historical registration, and a SIGNED arrival check (the nurse's
// day-one half) for most of them. Lerato (1) and Anele (3) get a pre-camp
// medical but NO arrival check, so the draft -> sign demo path has
// registrations to work with (one arrival check per registration, DB-enforced).
// ---------------------------------------------------------------------------
Console.WriteLine("Creating pre-camp medicals and arrival checks...");
async Task Precamp(Guid campId, Kid k, Guid capturedBy, string capturedAt)
{
    var hiv = k.HivPositive;
    await Exec("""
        insert into precamp_medicals (precamp_id, registration_id, diagnosis, hospital_file_number,
            treating_contact, vl_over1000, viral_load, vl_test_date, vl_date_received, clinical_findings,
            tb_status, hepatitis_b, tb_ois_history, medication_list, adherence_barriers,
            adherence_barriers_detail, dietary_requirements, religion, additional_info,
            camper_history_notes, captured_by, captured_at)
        values (gen_random_uuid(), @reg, @diag, @hospFile, @contact, @vlOver, @vl, @vlDate::date,
            @vlReceived::date, @findings, @tb, @hepB, false, @meds::jsonb, false, null,
            @diet, null, null, null, @by, @at::timestamptz)
        """,
        ("reg", regs[(campId, k.Id)]),
        ("diag", k.Diagnosis),
        ("hospFile", k.Diagnosis is null ? null : "H-" + k.FileNo[^4..]),
        ("contact", k.Clinic is null ? null : k.Clinic + " oncology unit"),
        ("vlOver", hiv ? (object)false : null),
        ("vl", hiv ? "Undetectable (<50)" : null),
        ("vlDate", hiv ? "2026-05-20" : null),
        ("vlReceived", hiv ? "2026-06-02" : null),
        ("findings", k.Diagnosis is null ? null : "Stable on current treatment plan"),
        ("tb", hiv ? "negative" : null),
        ("hepB", hiv ? (object)false : null),
        ("meds", k.HivPositive ? """["ART (see prescriptions)"]""" : k.First == "Lwazi" ? """["Sodium valproate 200mg BD"]""" : null),
        ("diet", k.First == "Emma" ? "Strict nut-free diet" : k.First == "Junaid" ? "Halaal" : null),
        ("by", capturedBy), ("at", capturedAt));
}

async Task ArrivalCheck(Guid campId, Kid k, Guid assessedBy, string assessedAt)
{
    await Exec("""
        insert into arrival_checks (arrival_check_id, registration_id, has_allergies, allergies_detail,
            eyesight, hearing, mobility_aids, prosthesis, adl_needs, tb_screening, has_medication,
            medication_handed_in, medication_handed_in_date, medication_list, physical_condition,
            status, assessed_by, assessed_at, signed_at, signed_by)
        values (gen_random_uuid(), @reg, @hasAllergies, @allergies, 'Normal', 'Normal', @mobility,
            @prosthesis, @adl::jsonb, @screening::jsonb, @hasMeds, @handedIn, @handedInDate::date,
            @meds::jsonb, @condition, 'signed', @by, @at::timestamptz, @at::timestamptz, @by)
        """,
        ("reg", regs[(campId, k.Id)]),
        ("hasAllergies", k.Allergies is not null),
        ("allergies", k.Allergies),
        ("mobility", k.First == "Kagiso" ? "Crutches" : k.First == "Dewald" ? "Walking frame (short distances)" : null),
        ("prosthesis", k.First == "Kagiso" ? "Right above-knee prosthesis" : k.First == "Naledi" ? "Left ocular prosthesis" : null),
        ("adl", """{"shower":"independent","dressing":"independent","toileting":"independent","eating":"independent"}"""),
        ("screening", """{"cough_over_2_weeks":false,"weight_loss":false,"night_sweats":false}"""),
        ("hasMeds", k.HivPositive || k.First == "Lwazi"),
        ("handedIn", k.HivPositive || k.First == "Lwazi"),
        ("handedInDate", k.HivPositive || k.First == "Lwazi" ? assessedAt[..10] : null),
        ("meds", k.HivPositive ? """["ART (see prescriptions); handed in at MedShack"]""" : k.First == "Lwazi" ? """["Sodium valproate 200mg BD"]""" : null),
        ("condition", "Stable, cleared for full camp programme"),
        ("by", assessedBy), ("at", assessedAt));
}

for (var i = 0; i < 10; i++)
    await Precamp(campActive, campers[i], gail.CrewId, "2026-06-20 10:00+02");
foreach (var i in new[] { 0, 2, 4, 6, 8, 10, 12, 14 })
    await Precamp(campPast, campers[i], gail.CrewId, "2025-11-15 10:00+02");

foreach (var i in new[] { 0, 2, 4, 5, 6, 7, 8, 9 })
    await ArrivalCheck(campActive, campers[i], i % 2 == 0 ? gail.CrewId : mbali.CrewId, "2026-07-10 11:00+02");
foreach (var i in new[] { 0, 4 })
    await ArrivalCheck(campPast, campers[i], i == 0 ? gail.CrewId : mbali.CrewId, "2025-12-05 10:00+02");

// ---------------------------------------------------------------------------
// Prescriptions + doses (active camp).
// ---------------------------------------------------------------------------
Console.WriteLine("Creating prescriptions and medication doses...");
var scripts = new (Kid Kid, string Med, string Dose, string Freq, string Times)[]
{
    (campers[0], "Abacavir/Lamivudine/Dolutegravir (paed)", "1 tablet", "Once daily", """["19:00"]"""),
    (campers[0], "Mercaptopurine (6-MP)", "50 mg", "Once nightly", """["20:00"]"""),
    (campers[2], "TLD (Tenofovir/Lamivudine/Dolutegravir)", "1 tablet", "Once daily", """["19:00"]"""),
    (campers[2], "Co-trimoxazole prophylaxis", "480 mg", "Once daily", """["08:00"]"""),
    (campers[10], "AZT/3TC + LPV/r syrup", "As per weight chart", "Twice daily", """["07:00","19:00"]"""),
    (campers[13], "Sodium valproate", "200 mg", "Twice daily", """["08:00","20:00"]"""),
};
foreach (var (kid, med, dose, freq, times) in scripts)
{
    // Zanele (index 10) is only registered on the planned camp for scripts, use her active reg if present
    var campForKid = regs.ContainsKey((campActive, kid.Id)) ? campActive : campPlanned;
    var scriptId = Guid.NewGuid();
    await Exec("""
        insert into prescriptions (prescription_id, registration_id, medication_name, dose, route, frequency,
                                   scheduled_times, start_date, prescribed_by, created_at)
        values (@id, @reg, @med, @dose, 'Oral', @freq, @times::jsonb, '2026-07-10'::date, @by, now())
        """,
        ("id", scriptId), ("reg", regs[(campForKid, kid.Id)]), ("med", med), ("dose", dose),
        ("freq", freq), ("times", times), ("by", mbali.CrewId));

    if (campForKid != campActive) continue;
    // Two administered doses (previous evenings) and one still scheduled today.
    foreach (var (day, status) in new[] { ("2026-07-12", "given"), ("2026-07-13", "given"), ("2026-07-14", "scheduled") })
    {
        await Exec("""
            insert into medication_doses (dose_id, prescription_id, scheduled_at, administered_at,
                                          administered_by, status, created_at)
            values (gen_random_uuid(), @script, @sched::timestamptz, @given::timestamptz, @by, @status, now())
            """,
            ("script", scriptId), ("sched", $"{day} 19:00+02"),
            ("given", status == "given" ? $"{day} 19:05+02" : null),
            ("by", status == "given" ? gail.CrewId : (object?)null), ("status", status));
    }
}

// ---------------------------------------------------------------------------
// MedShack visits + treatments (active camp).
// ---------------------------------------------------------------------------
Console.WriteLine("Creating MedShack visits and treatments...");
async Task<Guid> Visit(Kid k, string at, string reason, decimal temp, int pulse, string bp, int sats,
    string signs, string findings, string report, string advice, Guid? doctor)
{
    var visitId = Guid.NewGuid();
    await Exec("""
        insert into medshack_visits (visit_id, registration_id, visit_at, reason, accompanied_by, temperature,
            pulse, blood_pressure, oxygen_saturation, signs_symptoms, findings, nursing_report, advice_given,
            nurse_id, doctor_id, created_at)
        values (@id, @reg, @at::timestamptz, @reason, 'Cabin leader', @temp, @pulse, @bp, @sats,
                @signs, @findings, @report, @advice, @nurse, @doctor, now())
        """,
        ("id", visitId), ("reg", regs[(campActive, k.Id)]), ("at", at), ("reason", reason),
        ("temp", temp), ("pulse", pulse), ("bp", bp), ("sats", sats), ("signs", signs),
        ("findings", findings), ("report", report), ("advice", advice),
        ("nurse", gail.CrewId), ("doctor", doctor));
    return visitId;
}

async Task Treat(Guid visitId, int seq, string at, string description, string outcome)
{
    await Exec("""
        insert into medshack_treatments (treatment_id, visit_id, sequence_no, treatment_time,
                                         treatment_description, outcome, administered_by)
        values (gen_random_uuid(), @visit, @seq, @at::timestamptz, @desc, @outcome, @by)
        """,
        ("visit", visitId), ("seq", seq), ("at", at), ("desc", description), ("outcome", outcome), ("by", gail.CrewId));
}

var v1 = await Visit(campers[4], "2026-07-12 15:20+02", "Fell during soccer, graze on left knee",
    36.8m, 88, "110/70", 99, "Superficial graze, no other injury",
    "3 cm superficial abrasion, left knee. Prosthesis undamaged.",
    "Wound cleaned and dressed. Observed 20 min.", "Keep dressing dry; return tomorrow for check.", null);
await Treat(v1, 1, "2026-07-12 15:25+02", "Wound irrigated with saline, chlorhexidine applied", "Clean wound bed");
await Treat(v1, 2, "2026-07-12 15:35+02", "Non-adherent dressing applied", "Settled, returned to activities");

var v2 = await Visit(campers[6], "2026-07-13 18:40+02", "Headache and fatigue after hike",
    37.9m, 96, "105/68", 98, "Mild pyrexia, tired, no photophobia or neck stiffness",
    "Likely heat exhaustion / exertion. No red flags.",
    "Oral fluids given, rested in MedShack 1 hour.", "Encourage fluids; lighter programme tomorrow.", mbali.CrewId);
await Treat(v2, 1, "2026-07-13 18:50+02", "Paracetamol 500 mg PO administered", "Reviewed after 1 h, much improved");

var v3 = await Visit(campers[8], "2026-07-13 07:30+02", "Nausea after morning medication",
    36.6m, 84, "100/65", 99, "Nauseous, no vomiting, abdomen soft",
    "Medication-related nausea, resolving", "Observed through breakfast; tolerated dry toast.",
    "Give morning dose with food going forward.", null);
await Treat(v3, 1, "2026-07-13 07:45+02", "Ondansetron 2 mg PO administered per standing order", "Nausea settled within 30 min");

// ---------------------------------------------------------------------------
// Crew medical check-ins for the active camp.
// ---------------------------------------------------------------------------
Console.WriteLine("Creating crew medical check-ins...");
foreach (var s in new[] { gail, mbali, lize })
{
    await Exec("""
        insert into crew_medical_checkins (checkin_id, crew_id, camp_id, allergies, has_broviac_port,
            medical_release_signed, checked_in_by, checked_in_at)
        values (gen_random_uuid(), @crew, @camp, @allergies, false, true, @by, '2026-07-10 08:00+02'::timestamptz)
        """,
        ("crew", s.CrewId), ("camp", campActive),
        ("allergies", s.Name == "Mbali" ? "Bee stings (carries adrenaline pen)" : null),
        ("by", gail.CrewId));
}

await tx.CommitAsync();
Console.WriteLine("\nSeed committed.\n");

// ---------------------------------------------------------------------------
// Summary counts.
// ---------------------------------------------------------------------------
Console.WriteLine("--- Row counts per table ---");
foreach (var table in new[]
{
    "crew_members", "users", "camps", "campers", "caregivers", "emergency_contacts",
    "camp_registrations", "consent_records", "precamp_medicals", "arrival_checks", "prescriptions",
    "medication_doses", "medshack_visits", "medshack_treatments", "medication_events",
    "crew_medical_checkins", "audit_logs",
})
{
    await using var cmd = new NpgsqlCommand($"select count(*) from {table}", db);
    Console.WriteLine($"  {table,-22} {await cmd.ExecuteScalarAsync()}");
}
{
    await using var cmd = new NpgsqlCommand(
        "select count(*) from auth.users where email like '%@jffdemo.org'", db);
    Console.WriteLine($"  {"auth.users (demo)",-22} {await cmd.ExecuteScalarAsync()}");
}

// ---------------------------------------------------------------------------
// Runtime-role probe: query a camper as jff_api with Gail's identity, the same
// way the API does after validating her JWT.
// ---------------------------------------------------------------------------
Console.WriteLine("\n--- jff_api runtime-role probe (as Gail) ---");
await using (var api = new NpgsqlConnection(apiConnString))
{
    await api.OpenAsync();
    await using (var set = new NpgsqlCommand("select set_config('app.current_user_id', @uid, false)", api))
    {
        set.Parameters.AddWithValue("uid", gail.UserId.ToString());
        await set.ExecuteScalarAsync();
    }
    await using var probe = new NpgsqlCommand("""
        select c.first_name || ' ' || c.surname || ' (' || c.file_number || ') — ' || coalesce(c.diagnosis, 'no diagnosis')
        from campers c
        where c.file_number = 'JFF-0401'
        """, api);
    Console.WriteLine($"  camper visible to jff_api: {await probe.ExecuteScalarAsync()}");
}

// ---------------------------------------------------------------------------
// Credentials (regenerated on every run).
// ---------------------------------------------------------------------------
Console.WriteLine("\n--- LOGIN CREDENTIALS (new passwords every run) ---");
foreach (var s in staff)
    Console.WriteLine($"  {s.Permission,-8} {s.Email,-32} {s.Password}");

Console.WriteLine("\n=== done ===");

internal sealed record Staff(Guid UserId, Guid CrewId, string Name, string Surname, string Email,
    string Role, string Permission, string Password);

internal sealed record Kid(string First, string Surname, string Dob, string Sex, string? Language,
    string? Diagnosis, string? Clinic, string FileNo, Guid? FamilyGroup, string? Allergies,
    bool HivPositive, string CaregiverName, string CaregiverCell)
{
    public Guid Id { get; } = Guid.NewGuid();
}
