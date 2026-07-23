-- Enables Row-Level Security on every table and defines the one identity helper
-- function that all policies in 002_rls_policies.sql depend on.
--
-- app_current_user_id(): resolves the current session's identity to this app's
-- own "users" row. Returns NULL if there is no session identity set, or it has
-- no matching (or an inactive) "users" row -- callers treat NULL as
-- "not authorised" via `IS NOT NULL` checks in the policies themselves.
--
-- Layer 3 design (not Supabase's auth.uid()): this backend connects to Postgres
-- directly via Npgsql/EF Core, bypassing Supabase's PostgREST/Data-API gateway
-- entirely. auth.uid() reads GUCs (request.jwt.claim.sub) that only PostgREST
-- sets -- on a direct connection those GUCs are never populated, so auth.uid()
-- would silently return NULL on every request. Instead, the ASP.NET Core layer
-- (JffEhr.Api/Data/UserIdentityConnectionInterceptor.cs) sets a custom, app-owned
-- session variable, app.current_user_id, immediately after each physical
-- connection opens, populated from the already-validated JWT's `sub` claim. This
-- function reads that variable instead. NULLIF(..., '') guards the case where the
-- variable is unset (an unauthenticated connection, or the interceptor's
-- ConnectionClosing clear) -- current_setting(..., true) returns '' rather than
-- erroring when the GUC has never been set in this session.
--
-- Assumption flagged for review: this assumes users.user_id IS the Supabase Auth
-- uid (i.e. the "users" row is created with user_id = auth.uid() at signup).
-- If that ever changes, only the interceptor's source claim needs to change --
-- this function's shape is unaffected.
CREATE OR REPLACE FUNCTION app_current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT user_id
    FROM users
    WHERE user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
      AND is_active = true;
$$;

ALTER TABLE campers ENABLE ROW LEVEL SECURITY;
ALTER TABLE caregivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE camps ENABLE ROW LEVEL SECURITY;
ALTER TABLE camp_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_medical_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE camper_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_doses ENABLE ROW LEVEL SECURITY;
ALTER TABLE medshack_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE medshack_treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
