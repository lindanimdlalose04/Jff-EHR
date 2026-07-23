-- RLS policies. Deliberately coarse-grained: this is the "even if the API layer is
-- bypassed" backstop, not the primary access-control mechanism -- fine-grained
-- per-role table access (e.g. "only nurses write medshack_visits") is layer 3's job
-- (ASP.NET Core RBAC), reviewed and built separately. Every policy here only checks
-- that the caller is a real, active, linked user via app_current_user_id().
--
-- Column-level immutability for clinical tables (only deleted_at/deleted_by may
-- change) is NOT expressed here -- RLS's WITH CHECK can't cleanly diff old vs new
-- column values, so that's left entirely to the trigger in
-- 003_clinical_immutability_triggers.sql. RLS's job for clinical tables is just:
-- no session gets a DELETE path at all, full stop.

-- ============================================================
-- Operational / reference tables: full CRUD for active users
-- ============================================================
-- campers, caregivers, emergency_contacts, crew_members, users, camps,
-- camp_registrations, crew_medical_checkins

CREATE POLICY campers_select ON campers FOR SELECT USING (app_current_user_id() IS NOT NULL);
CREATE POLICY campers_insert ON campers FOR INSERT WITH CHECK (app_current_user_id() IS NOT NULL);
CREATE POLICY campers_update ON campers FOR UPDATE USING (app_current_user_id() IS NOT NULL) WITH CHECK (app_current_user_id() IS NOT NULL);
CREATE POLICY campers_delete ON campers FOR DELETE USING (app_current_user_id() IS NOT NULL);

CREATE POLICY caregivers_select ON caregivers FOR SELECT USING (app_current_user_id() IS NOT NULL);
CREATE POLICY caregivers_insert ON caregivers FOR INSERT WITH CHECK (app_current_user_id() IS NOT NULL);
CREATE POLICY caregivers_update ON caregivers FOR UPDATE USING (app_current_user_id() IS NOT NULL) WITH CHECK (app_current_user_id() IS NOT NULL);
CREATE POLICY caregivers_delete ON caregivers FOR DELETE USING (app_current_user_id() IS NOT NULL);

CREATE POLICY emergency_contacts_select ON emergency_contacts FOR SELECT USING (app_current_user_id() IS NOT NULL);
CREATE POLICY emergency_contacts_insert ON emergency_contacts FOR INSERT WITH CHECK (app_current_user_id() IS NOT NULL);
CREATE POLICY emergency_contacts_update ON emergency_contacts FOR UPDATE USING (app_current_user_id() IS NOT NULL) WITH CHECK (app_current_user_id() IS NOT NULL);
CREATE POLICY emergency_contacts_delete ON emergency_contacts FOR DELETE USING (app_current_user_id() IS NOT NULL);

CREATE POLICY crew_members_select ON crew_members FOR SELECT USING (app_current_user_id() IS NOT NULL);
CREATE POLICY crew_members_insert ON crew_members FOR INSERT WITH CHECK (app_current_user_id() IS NOT NULL);
CREATE POLICY crew_members_update ON crew_members FOR UPDATE USING (app_current_user_id() IS NOT NULL) WITH CHECK (app_current_user_id() IS NOT NULL);
CREATE POLICY crew_members_delete ON crew_members FOR DELETE USING (app_current_user_id() IS NOT NULL);

-- users: SELECT/UPDATE relies on app_current_user_id() being SECURITY DEFINER (it
-- bypasses this same RLS when it queries "users" internally), so no recursion.
CREATE POLICY users_select ON users FOR SELECT USING (app_current_user_id() IS NOT NULL);
CREATE POLICY users_insert ON users FOR INSERT WITH CHECK (app_current_user_id() IS NOT NULL);
CREATE POLICY users_update ON users FOR UPDATE USING (app_current_user_id() IS NOT NULL) WITH CHECK (app_current_user_id() IS NOT NULL);
CREATE POLICY users_delete ON users FOR DELETE USING (app_current_user_id() IS NOT NULL);

CREATE POLICY camps_select ON camps FOR SELECT USING (app_current_user_id() IS NOT NULL);
CREATE POLICY camps_insert ON camps FOR INSERT WITH CHECK (app_current_user_id() IS NOT NULL);
CREATE POLICY camps_update ON camps FOR UPDATE USING (app_current_user_id() IS NOT NULL) WITH CHECK (app_current_user_id() IS NOT NULL);
CREATE POLICY camps_delete ON camps FOR DELETE USING (app_current_user_id() IS NOT NULL);

CREATE POLICY camp_registrations_select ON camp_registrations FOR SELECT USING (app_current_user_id() IS NOT NULL);
CREATE POLICY camp_registrations_insert ON camp_registrations FOR INSERT WITH CHECK (app_current_user_id() IS NOT NULL);
CREATE POLICY camp_registrations_update ON camp_registrations FOR UPDATE USING (app_current_user_id() IS NOT NULL) WITH CHECK (app_current_user_id() IS NOT NULL);
CREATE POLICY camp_registrations_delete ON camp_registrations FOR DELETE USING (app_current_user_id() IS NOT NULL);

CREATE POLICY crew_medical_checkins_select ON crew_medical_checkins FOR SELECT USING (app_current_user_id() IS NOT NULL);
CREATE POLICY crew_medical_checkins_insert ON crew_medical_checkins FOR INSERT WITH CHECK (app_current_user_id() IS NOT NULL);
CREATE POLICY crew_medical_checkins_update ON crew_medical_checkins FOR UPDATE USING (app_current_user_id() IS NOT NULL) WITH CHECK (app_current_user_id() IS NOT NULL);
CREATE POLICY crew_medical_checkins_delete ON crew_medical_checkins FOR DELETE USING (app_current_user_id() IS NOT NULL);

-- ============================================================
-- Clinical tables: SELECT/INSERT/UPDATE for active users, DELETE blocked outright.
-- UPDATE's column-level restriction (deleted_at/deleted_by only) is enforced by the
-- trigger, not here -- see the module comment above.
-- ============================================================
-- camper_assessments, consent_records, prescriptions, medication_doses,
-- medshack_visits, medshack_treatments, medication_events

CREATE POLICY camper_assessments_select ON camper_assessments FOR SELECT USING (app_current_user_id() IS NOT NULL);
CREATE POLICY camper_assessments_insert ON camper_assessments FOR INSERT WITH CHECK (app_current_user_id() IS NOT NULL);
CREATE POLICY camper_assessments_update ON camper_assessments FOR UPDATE USING (app_current_user_id() IS NOT NULL) WITH CHECK (app_current_user_id() IS NOT NULL);
CREATE POLICY camper_assessments_delete_none ON camper_assessments FOR DELETE USING (false);

CREATE POLICY consent_records_select ON consent_records FOR SELECT USING (app_current_user_id() IS NOT NULL);
CREATE POLICY consent_records_insert ON consent_records FOR INSERT WITH CHECK (app_current_user_id() IS NOT NULL);
CREATE POLICY consent_records_update ON consent_records FOR UPDATE USING (app_current_user_id() IS NOT NULL) WITH CHECK (app_current_user_id() IS NOT NULL);
CREATE POLICY consent_records_delete_none ON consent_records FOR DELETE USING (false);

CREATE POLICY prescriptions_select ON prescriptions FOR SELECT USING (app_current_user_id() IS NOT NULL);
CREATE POLICY prescriptions_insert ON prescriptions FOR INSERT WITH CHECK (app_current_user_id() IS NOT NULL);
CREATE POLICY prescriptions_update ON prescriptions FOR UPDATE USING (app_current_user_id() IS NOT NULL) WITH CHECK (app_current_user_id() IS NOT NULL);
CREATE POLICY prescriptions_delete_none ON prescriptions FOR DELETE USING (false);

CREATE POLICY medication_doses_select ON medication_doses FOR SELECT USING (app_current_user_id() IS NOT NULL);
CREATE POLICY medication_doses_insert ON medication_doses FOR INSERT WITH CHECK (app_current_user_id() IS NOT NULL);
CREATE POLICY medication_doses_update ON medication_doses FOR UPDATE USING (app_current_user_id() IS NOT NULL) WITH CHECK (app_current_user_id() IS NOT NULL);
CREATE POLICY medication_doses_delete_none ON medication_doses FOR DELETE USING (false);

CREATE POLICY medshack_visits_select ON medshack_visits FOR SELECT USING (app_current_user_id() IS NOT NULL);
CREATE POLICY medshack_visits_insert ON medshack_visits FOR INSERT WITH CHECK (app_current_user_id() IS NOT NULL);
CREATE POLICY medshack_visits_update ON medshack_visits FOR UPDATE USING (app_current_user_id() IS NOT NULL) WITH CHECK (app_current_user_id() IS NOT NULL);
CREATE POLICY medshack_visits_delete_none ON medshack_visits FOR DELETE USING (false);

CREATE POLICY medshack_treatments_select ON medshack_treatments FOR SELECT USING (app_current_user_id() IS NOT NULL);
CREATE POLICY medshack_treatments_insert ON medshack_treatments FOR INSERT WITH CHECK (app_current_user_id() IS NOT NULL);
CREATE POLICY medshack_treatments_update ON medshack_treatments FOR UPDATE USING (app_current_user_id() IS NOT NULL) WITH CHECK (app_current_user_id() IS NOT NULL);
CREATE POLICY medshack_treatments_delete_none ON medshack_treatments FOR DELETE USING (false);

CREATE POLICY medication_events_select ON medication_events FOR SELECT USING (app_current_user_id() IS NOT NULL);
CREATE POLICY medication_events_insert ON medication_events FOR INSERT WITH CHECK (app_current_user_id() IS NOT NULL);
CREATE POLICY medication_events_update ON medication_events FOR UPDATE USING (app_current_user_id() IS NOT NULL) WITH CHECK (app_current_user_id() IS NOT NULL);
CREATE POLICY medication_events_delete_none ON medication_events FOR DELETE USING (false);

-- ============================================================
-- audit_logs: append-only. SELECT restricted to admins; INSERT allowed for any
-- active user (writing their own audit trail entries); UPDATE/DELETE blocked
-- outright (redundant with the trigger in 004, kept here as defence in depth too).
--
-- Assumption flagged for review: 'admin' is the only role_permissions literal this
-- migration relies on. If the actual value differs, update this one policy.
-- ============================================================

CREATE POLICY audit_logs_select_admin ON audit_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.user_id = auth.uid()
              AND u.is_active = true
              AND u.role_permissions = 'admin'
        )
    );

CREATE POLICY audit_logs_insert ON audit_logs FOR INSERT WITH CHECK (app_current_user_id() IS NOT NULL);
CREATE POLICY audit_logs_update_none ON audit_logs FOR UPDATE USING (false);
CREATE POLICY audit_logs_delete_none ON audit_logs FOR DELETE USING (false);
