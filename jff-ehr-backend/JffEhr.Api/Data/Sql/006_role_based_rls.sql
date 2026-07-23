-- Role-based RLS rewrite (the brief's "RLS and auth fix").
--
-- Before this migration every policy was authentication-only
-- (app_current_user_id() IS NOT NULL), so any logged-in user could edit
-- anything. That contradicted the client's rule: everyone VIEWS, only the
-- medical team EDITS clinical records. This file makes that rule enforced at
-- the database, not merely intended at the API.
--
-- Identity is standardised on app_current_user_id() everywhere; the old
-- audit_logs admin policy was the one place still reading auth.uid(), which is
-- never populated on this backend's direct Npgsql connections (see
-- 001_enable_rls.sql). It is rewritten below via app_user_role().
--
-- Role matrix (role_permissions has exactly two values, 'medical' and 'admin'):
--   Tier 1 admin/demographic tables ... SELECT any authenticated user;
--       INSERT/UPDATE/DELETE medical or admin (Gail pre-loads profiles herself,
--       so medical must be able to maintain demographic data too).
--   Tier 2 clinical tables ........... SELECT any authenticated user;
--       INSERT/UPDATE medical only; DELETE never (soft delete is an UPDATE).
--   users ............................ SELECT any authenticated user;
--       INSERT/UPDATE/DELETE admin only.
--   audit_logs ....................... SELECT admin only; INSERT any
--       authenticated user (writing their own trail); UPDATE/DELETE never.
--
-- Note on arrival_checks: the brief asked for "no UPDATE once signed" inside
-- the UPDATE policy's USING clause, but a soft delete IS an update, and signed
-- checks must remain soft-deletable for the amend flow the brief also requires.
-- The column-level rule (signed rows may only change deleted_at/deleted_by)
-- cannot be expressed in RLS and lives in the trg_arrival_checks_lock trigger
-- (005). RLS here restricts WHO may update; the trigger restricts WHAT.

-- ============================================================
-- Helper: the caller's role, resolved through the same identity
-- seam as app_current_user_id(). NULL when unauthenticated.
-- ============================================================
CREATE OR REPLACE FUNCTION app_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role_permissions
    FROM users
    WHERE user_id = app_current_user_id()
      AND is_active = true;
$$;

-- ============================================================
-- Drop the authentication-only policies from 002_rls_policies.sql.
-- (camper_assessments' policies vanished with the table.)
-- ============================================================
DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'campers', 'caregivers', 'emergency_contacts', 'crew_members', 'users',
        'camps', 'camp_registrations', 'crew_medical_checkins', 'consent_records',
        'prescriptions', 'medication_doses', 'medshack_visits',
        'medshack_treatments', 'medication_events']
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I_select ON %I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS %I_insert ON %I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS %I_update ON %I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS %I_delete ON %I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS %I_delete_none ON %I', t, t);
    END LOOP;
END $$;

DROP POLICY IF EXISTS audit_logs_select_admin ON audit_logs;
DROP POLICY IF EXISTS audit_logs_insert ON audit_logs;
DROP POLICY IF EXISTS audit_logs_update_none ON audit_logs;
DROP POLICY IF EXISTS audit_logs_delete_none ON audit_logs;

-- ============================================================
-- Tier 1: campers, caregivers, emergency_contacts, crew_members,
-- camps, camp_registrations, crew_medical_checkins
-- ============================================================
DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'campers', 'caregivers', 'emergency_contacts', 'crew_members',
        'camps', 'camp_registrations', 'crew_medical_checkins']
    LOOP
        EXECUTE format(
            'CREATE POLICY %I_select ON %I FOR SELECT USING (app_current_user_id() IS NOT NULL)', t, t);
        EXECUTE format(
            'CREATE POLICY %I_insert ON %I FOR INSERT WITH CHECK (app_user_role() IN (''medical'', ''admin''))', t, t);
        EXECUTE format(
            'CREATE POLICY %I_update ON %I FOR UPDATE USING (app_user_role() IN (''medical'', ''admin'')) WITH CHECK (app_user_role() IN (''medical'', ''admin''))', t, t);
        EXECUTE format(
            'CREATE POLICY %I_delete ON %I FOR DELETE USING (app_user_role() IN (''medical'', ''admin''))', t, t);
    END LOOP;
END $$;

-- ============================================================
-- users: everyone may resolve display data; only admin manages accounts.
-- ============================================================
CREATE POLICY users_select ON users FOR SELECT USING (app_current_user_id() IS NOT NULL);
CREATE POLICY users_insert ON users FOR INSERT WITH CHECK (app_user_role() = 'admin');
CREATE POLICY users_update ON users FOR UPDATE USING (app_user_role() = 'admin') WITH CHECK (app_user_role() = 'admin');
CREATE POLICY users_delete ON users FOR DELETE USING (app_user_role() = 'admin');

-- ============================================================
-- Tier 2 clinical: precamp_medicals, arrival_checks, consent_records,
-- prescriptions, medication_doses, medshack_visits, medshack_treatments,
-- medication_events. Everyone views, medical writes, nobody hard-deletes.
-- ============================================================
DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'precamp_medicals', 'arrival_checks', 'consent_records', 'prescriptions',
        'medication_doses', 'medshack_visits', 'medshack_treatments',
        'medication_events']
    LOOP
        EXECUTE format(
            'CREATE POLICY %I_select ON %I FOR SELECT USING (app_current_user_id() IS NOT NULL)', t, t);
        EXECUTE format(
            'CREATE POLICY %I_insert ON %I FOR INSERT WITH CHECK (app_user_role() = ''medical'')', t, t);
        EXECUTE format(
            'CREATE POLICY %I_update ON %I FOR UPDATE USING (app_user_role() = ''medical'') WITH CHECK (app_user_role() = ''medical'')', t, t);
        EXECUTE format(
            'CREATE POLICY %I_delete_none ON %I FOR DELETE USING (false)', t, t);
    END LOOP;
END $$;

-- ============================================================
-- audit_logs: append-only, admin-readable. Now on the same identity
-- seam as everything else (no auth.uid()).
-- ============================================================
CREATE POLICY audit_logs_select_admin ON audit_logs FOR SELECT
    USING (app_user_role() = 'admin');
CREATE POLICY audit_logs_insert ON audit_logs FOR INSERT
    WITH CHECK (app_current_user_id() IS NOT NULL);
CREATE POLICY audit_logs_update_none ON audit_logs FOR UPDATE USING (false);
CREATE POLICY audit_logs_delete_none ON audit_logs FOR DELETE USING (false);
