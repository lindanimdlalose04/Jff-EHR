using System.Text.Json;
using Npgsql;

// ============================================================================
// JFF EHR — clinical immutability evidence run
//
// Proves, against the real Supabase database, that:
//   1. RLS fails closed: a jff_api session with no identity sees/changes nothing.
//   2. The clinical immutability trigger rejects UPDATEs to signed clinical
//      fields, even for an authenticated session that RLS lets through.
//   3. RLS blocks clinical DELETE outright for jff_api (0 rows), and the
//      trigger blocks it even for the schema OWNER (who bypasses RLS).
//   4. Soft-delete (deleted_at/deleted_by only) succeeds as jff_api.
//   5. audit_logs is append-only: UPDATE/DELETE blocked by RLS for jff_api
//      and by trigger for the owner.
//
// Connections: "owner" = ConnectionStrings:JffEhrDbMigrations (table owner,
// bypasses RLS, still subject to triggers). "jff_api" = ConnectionStrings:
// JffEhrDb (runtime role: rolsuper=false, rolbypassrls=false).
// ============================================================================

var secretsPath = Path.Combine(
    Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
    "Microsoft", "UserSecrets", "2a6c0eb3-edd4-4cd9-8a80-80eebe2d8589", "secrets.json");
var secrets = JsonDocument.Parse(File.ReadAllText(secretsPath));
var ownerConn = secrets.RootElement.GetProperty("ConnectionStrings:JffEhrDbMigrations").GetString()!;
var apiConn = secrets.RootElement.GetProperty("ConnectionStrings:JffEhrDb").GetString()!;

var suffix = Guid.NewGuid().ToString("N")[..8];
var crewId = Guid.NewGuid();
var userId = Guid.NewGuid(); // stands in for the Supabase Auth uid
var camperId = Guid.NewGuid();
var campId = Guid.NewGuid();
var registrationId = Guid.NewGuid();
var consentId = Guid.NewGuid();
var auditId = Guid.NewGuid();

Console.WriteLine($"=== JFF EHR immutability evidence run — {DateTimeOffset.UtcNow:u} ===");
Console.WriteLine($"seed suffix: {suffix}\n");

await using var owner = new NpgsqlConnection(ownerConn);
await owner.OpenAsync();
await using var api = new NpgsqlConnection(apiConn);
await api.OpenAsync();

async Task<int> Exec(NpgsqlConnection c, string sql, Action<NpgsqlParameterCollection>? bind = null)
{
    await using var cmd = new NpgsqlCommand(sql, c);
    bind?.Invoke(cmd.Parameters);
    return await cmd.ExecuteNonQueryAsync();
}

async Task<object?> Scalar(NpgsqlConnection c, string sql, Action<NpgsqlParameterCollection>? bind = null)
{
    await using var cmd = new NpgsqlCommand(sql, c);
    bind?.Invoke(cmd.Parameters);
    return await cmd.ExecuteScalarAsync();
}

// Runs one attack attempt and reports whether the DB blocked it and how.
async Task Attempt(string label, string expect, NpgsqlConnection c, string sql,
    Action<NpgsqlParameterCollection>? bind = null)
{
    Console.WriteLine($"[{label}]");
    Console.WriteLine($"  sql:    {sql.Replace("\n", " ").Trim()}");
    Console.WriteLine($"  expect: {expect}");
    try
    {
        var rows = await Exec(c, sql, bind);
        Console.WriteLine($"  result: statement ACCEPTED, {rows} row(s) affected" +
            (rows == 0 ? "  <- no row was visible/permitted under RLS, so nothing changed" : ""));
    }
    catch (PostgresException ex)
    {
        Console.WriteLine($"  result: REJECTED by database — SQLSTATE {ex.SqlState}: {ex.MessageText}");
    }
    Console.WriteLine();
}

// ---------------------------------------------------------------------------
// SEED (as owner)
// ---------------------------------------------------------------------------
Console.WriteLine("--- SEED (as owner connection, migrations-only role) ---");

await Exec(owner, """
    insert into crew_members (crew_id, name, surname, id_number, role, created_at)
    values (@id, 'Evidence', 'Tester', @idnum, 'nurse', now())
    """, p => { p.AddWithValue("id", crewId); p.AddWithValue("idnum", $"TEST-{suffix}"); });
Console.WriteLine($"  crew_members       + {crewId}");

await Exec(owner, """
    insert into users (user_id, crew_id, email, password_hash, role_permissions, is_active, created_at)
    values (@id, @crew, @email, 'managed-by-supabase-auth', 'medical', true, now())
    """, p => { p.AddWithValue("id", userId); p.AddWithValue("crew", crewId); p.AddWithValue("email", $"evidence-{suffix}@test.local"); });
Console.WriteLine($"  users              + {userId} (active, role_permissions=medical)");

await Exec(owner, """
    insert into campers (camper_id, first_name, surname, dob, sex, file_number, created_at, updated_at)
    values (@id, 'Evidence', 'Camper', '2015-01-01', 'F', @file, now(), now())
    """, p => { p.AddWithValue("id", camperId); p.AddWithValue("file", $"TEST-{suffix}"); });
Console.WriteLine($"  campers            + {camperId}");

await Exec(owner, """
    insert into camps (camp_id, camp_number, start_date, end_date, venue, province, camp_type, status, created_at)
    values (@id, @num, '2026-12-01', '2026-12-07', 'Evidence Venue', 'Gauteng', 'test', 'planned', now())
    """, p => { p.AddWithValue("id", campId); p.AddWithValue("num", 900000 + Random.Shared.Next(99999)); });
Console.WriteLine($"  camps              + {campId}");

await Exec(owner, """
    insert into camp_registrations (registration_id, camp_id, camper_id, status, registered_at)
    values (@id, @camp, @camper, 'registered', now())
    """, p => { p.AddWithValue("id", registrationId); p.AddWithValue("camp", campId); p.AddWithValue("camper", camperId); });
Console.WriteLine($"  camp_registrations + {registrationId}");

await Exec(owner, """
    insert into consent_records (consent_id, registration_id, consent_type, signed_by, signed_at, popia_acknowledged)
    values (@id, @reg, 'medical_treatment', 'Evidence Guardian', now(), true)
    """, p => { p.AddWithValue("id", consentId); p.AddWithValue("reg", registrationId); });
Console.WriteLine($"  consent_records    + {consentId}  <- the signed clinical record under test");

await Exec(owner, """
    insert into audit_logs (audit_id, user_id, entity_table, entity_id, action, created_at)
    values (@id, @user, 'consent_records', @entity, 'INSERT', now())
    """, p => { p.AddWithValue("id", auditId); p.AddWithValue("user", userId); p.AddWithValue("entity", consentId); });
Console.WriteLine($"  audit_logs         + {auditId}  <- the audit entry under test\n");

// ---------------------------------------------------------------------------
// TEST 0 — jff_api with NO session identity: RLS fails closed
// ---------------------------------------------------------------------------
Console.WriteLine("--- TEST 0: jff_api with NO session identity (RLS fail-closed) ---");
var visible = await Scalar(api, "select count(*) from consent_records where consent_id = @id",
    p => p.AddWithValue("id", consentId));
Console.WriteLine($"  SELECT of the seeded consent row as anonymous jff_api: {visible} row(s) visible (expect 0)\n");

await Attempt("TEST 0b: anonymous UPDATE", "0 rows affected (row invisible under RLS)", api,
    "update consent_records set signed_by = 'Anon Tamper' where consent_id = @id",
    p => p.AddWithValue("id", consentId));

// ---------------------------------------------------------------------------
// Simulate an authenticated app session, exactly as
// UserIdentityConnectionInterceptor does after validating the JWT.
// ---------------------------------------------------------------------------
Console.WriteLine("--- Simulating authenticated session on jff_api connection ---");
await Exec(api, "select set_config('app.current_user_id', @uid, false)",
    p => p.AddWithValue("uid", userId.ToString()));
visible = await Scalar(api, "select count(*) from consent_records where consent_id = @id",
    p => p.AddWithValue("id", consentId));
Console.WriteLine($"  set_config('app.current_user_id', '{userId}') done");
Console.WriteLine($"  SELECT of the seeded consent row now returns: {visible} row(s) (expect 1)\n");

// ---------------------------------------------------------------------------
// TEST 1 — authenticated jff_api UPDATE of clinical fields -> trigger blocks
// ---------------------------------------------------------------------------
await Attempt("TEST 1: jff_api UPDATE clinical field (signed_by)",
    "REJECTED by trigger enforce_clinical_immutability()", api,
    "update consent_records set signed_by = 'Tampered Name' where consent_id = @id",
    p => p.AddWithValue("id", consentId));

await Attempt("TEST 1b: jff_api UPDATE another clinical field (popia_acknowledged)",
    "REJECTED by trigger enforce_clinical_immutability()", api,
    "update consent_records set popia_acknowledged = false where consent_id = @id",
    p => p.AddWithValue("id", consentId));

// ---------------------------------------------------------------------------
// TEST 2 — DELETE of the clinical record
// ---------------------------------------------------------------------------
await Attempt("TEST 2: jff_api DELETE clinical record",
    "0 rows affected (RLS policy consent_records_delete_none USING (false) hides all rows from DELETE)", api,
    "delete from consent_records where consent_id = @id",
    p => p.AddWithValue("id", consentId));

await Attempt("TEST 2b: OWNER DELETE clinical record (owner bypasses RLS, trigger still fires)",
    "REJECTED by trigger enforce_clinical_immutability()", owner,
    "delete from consent_records where consent_id = @id",
    p => p.AddWithValue("id", consentId));

await Attempt("TEST 2c: OWNER UPDATE clinical field (owner bypasses RLS, trigger still fires)",
    "REJECTED by trigger enforce_clinical_immutability()", owner,
    "update consent_records set signed_by = 'Owner Tamper' where consent_id = @id",
    p => p.AddWithValue("id", consentId));

// ---------------------------------------------------------------------------
// TEST 3 — soft-delete flags only, as jff_api -> allowed
// ---------------------------------------------------------------------------
await Attempt("TEST 3: jff_api soft-delete (deleted_at + deleted_by ONLY)",
    "ACCEPTED, 1 row affected — the one permitted mutation", api,
    "update consent_records set deleted_at = now(), deleted_by = @crew where consent_id = @id",
    p => { p.AddWithValue("crew", crewId); p.AddWithValue("id", consentId); });

var softState = await Scalar(api,
    "select 'deleted_at=' || deleted_at::text || ', deleted_by=' || deleted_by::text || ', signed_by still=' || signed_by " +
    "from consent_records where consent_id = @id",
    p => p.AddWithValue("id", consentId));
Console.WriteLine($"  post-check: {softState}\n");

// ---------------------------------------------------------------------------
// TEST 4 — audit_logs append-only
// ---------------------------------------------------------------------------
await Attempt("TEST 4: jff_api UPDATE audit_logs",
    "0 rows affected (RLS policy audit_logs_update_none USING (false))", api,
    "update audit_logs set action = 'TAMPERED' where audit_id = @id",
    p => p.AddWithValue("id", auditId));

await Attempt("TEST 4b: jff_api DELETE audit_logs",
    "0 rows affected (RLS policy audit_logs_delete_none USING (false))", api,
    "delete from audit_logs where audit_id = @id",
    p => p.AddWithValue("id", auditId));

await Attempt("TEST 4c: OWNER UPDATE audit_logs (bypasses RLS, trigger still fires)",
    "REJECTED by trigger block_audit_log_mutation()", owner,
    "update audit_logs set action = 'TAMPERED' where audit_id = @id",
    p => p.AddWithValue("id", auditId));

await Attempt("TEST 4d: OWNER DELETE audit_logs (bypasses RLS, trigger still fires)",
    "REJECTED by trigger block_audit_log_mutation()", owner,
    "delete from audit_logs where audit_id = @id",
    p => p.AddWithValue("id", auditId));

// ---------------------------------------------------------------------------
// CLEANUP (as owner). The protected rows cannot be deleted while the triggers
// are enabled -- removing throwaway seed data requires the owner to disable
// the triggers first, which is itself part of the evidence.
// ---------------------------------------------------------------------------
Console.WriteLine("--- CLEANUP (as owner; requires temporarily disabling the triggers) ---");

await Exec(owner, "alter table consent_records disable trigger trg_consent_records_immutability");
await Exec(owner, "delete from consent_records where consent_id = @id", p => p.AddWithValue("id", consentId));
await Exec(owner, "alter table consent_records enable trigger trg_consent_records_immutability");
Console.WriteLine("  consent_records: trigger disabled -> seed row deleted -> trigger re-enabled");

await Exec(owner, "alter table audit_logs disable trigger trg_audit_logs_append_only");
await Exec(owner, "delete from audit_logs where audit_id = @id", p => p.AddWithValue("id", auditId));
await Exec(owner, "alter table audit_logs enable trigger trg_audit_logs_append_only");
Console.WriteLine("  audit_logs:      trigger disabled -> seed row deleted -> trigger re-enabled");

await Exec(owner, "delete from camp_registrations where registration_id = @id", p => p.AddWithValue("id", registrationId));
await Exec(owner, "delete from camps where camp_id = @id", p => p.AddWithValue("id", campId));
await Exec(owner, "delete from campers where camper_id = @id", p => p.AddWithValue("id", camperId));
await Exec(owner, "delete from users where user_id = @id", p => p.AddWithValue("id", userId));
await Exec(owner, "delete from crew_members where crew_id = @id", p => p.AddWithValue("id", crewId));
Console.WriteLine("  camp_registrations, camps, campers, users, crew_members: seed rows deleted");

var leftovers = await Scalar(owner, """
    select (select count(*) from consent_records where consent_id = @c)
         + (select count(*) from audit_logs where audit_id = @a)
         + (select count(*) from crew_members where crew_id = @cr)
    """, p => { p.AddWithValue("c", consentId); p.AddWithValue("a", auditId); p.AddWithValue("cr", crewId); });
Console.WriteLine($"  leftover seed rows remaining: {leftovers} (expect 0)");
Console.WriteLine("\n=== run complete ===");
