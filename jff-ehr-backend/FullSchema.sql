CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    migration_id character varying(150) NOT NULL,
    product_version character varying(32) NOT NULL,
    CONSTRAINT pk___ef_migrations_history PRIMARY KEY (migration_id)
);

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260702195148_InitialCreate') THEN
    CREATE TABLE campers (
        camper_id uuid NOT NULL,
        first_name character varying(80) NOT NULL,
        surname character varying(80) NOT NULL,
        dob date NOT NULL,
        sex character varying(8) NOT NULL,
        race character varying(30),
        address text,
        cell_number character varying(20),
        language character varying(40),
        t_shirt_size character varying(8),
        photo_url text,
        diagnosis text,
        treating_clinic text,
        file_number character varying(20) NOT NULL,
        family_group_id uuid,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone NOT NULL,
        CONSTRAINT pk_campers PRIMARY KEY (camper_id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260702195148_InitialCreate') THEN
    CREATE TABLE camps (
        camp_id uuid NOT NULL,
        camp_number integer NOT NULL,
        start_date date NOT NULL,
        end_date date NOT NULL,
        venue character varying(200) NOT NULL,
        province character varying(40) NOT NULL,
        camp_type character varying(60) NOT NULL,
        status character varying(20) NOT NULL,
        created_at timestamp with time zone NOT NULL,
        CONSTRAINT pk_camps PRIMARY KEY (camp_id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260702195148_InitialCreate') THEN
    CREATE TABLE crew_members (
        crew_id uuid NOT NULL,
        name character varying(80) NOT NULL,
        surname character varying(80) NOT NULL,
        id_number character varying(20) NOT NULL,
        dob date,
        role character varying(60) NOT NULL,
        photo_url text,
        created_at timestamp with time zone NOT NULL,
        CONSTRAINT pk_crew_members PRIMARY KEY (crew_id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260702195148_InitialCreate') THEN
    CREATE TABLE caregivers (
        caregiver_id uuid NOT NULL,
        camper_id uuid NOT NULL,
        name character varying(160) NOT NULL,
        cell_no character varying(20) NOT NULL,
        work_no character varying(20),
        relationship character varying(40) NOT NULL,
        is_primary boolean NOT NULL,
        created_at timestamp with time zone NOT NULL,
        CONSTRAINT pk_caregivers PRIMARY KEY (caregiver_id),
        CONSTRAINT fk_caregivers_campers_camper_id FOREIGN KEY (camper_id) REFERENCES campers (camper_id) ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260702195148_InitialCreate') THEN
    CREATE TABLE emergency_contacts (
        contact_id uuid NOT NULL,
        camper_id uuid NOT NULL,
        name character varying(160) NOT NULL,
        cell_no character varying(20) NOT NULL,
        work_no character varying(20),
        relationship character varying(40) NOT NULL,
        created_at timestamp with time zone NOT NULL,
        CONSTRAINT pk_emergency_contacts PRIMARY KEY (contact_id),
        CONSTRAINT fk_emergency_contacts_campers_camper_id FOREIGN KEY (camper_id) REFERENCES campers (camper_id) ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260702195148_InitialCreate') THEN
    CREATE TABLE camp_registrations (
        registration_id uuid NOT NULL,
        camp_id uuid NOT NULL,
        camper_id uuid NOT NULL,
        cabin character varying(20),
        group_name character varying(40),
        status character varying(20) NOT NULL,
        registered_at timestamp with time zone NOT NULL,
        CONSTRAINT pk_camp_registrations PRIMARY KEY (registration_id),
        CONSTRAINT fk_camp_registrations_campers_camper_id FOREIGN KEY (camper_id) REFERENCES campers (camper_id) ON DELETE RESTRICT,
        CONSTRAINT fk_camp_registrations_camps_camp_id FOREIGN KEY (camp_id) REFERENCES camps (camp_id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260702195148_InitialCreate') THEN
    CREATE TABLE crew_medical_checkins (
        checkin_id uuid NOT NULL,
        crew_id uuid NOT NULL,
        camp_id uuid NOT NULL,
        allergies text,
        has_broviac_port boolean NOT NULL,
        eyesight text,
        hearing text,
        mobility_aids text,
        current_medications text,
        medical_release_signed boolean NOT NULL,
        checked_in_by uuid NOT NULL,
        checked_in_at timestamp with time zone NOT NULL,
        CONSTRAINT pk_crew_medical_checkins PRIMARY KEY (checkin_id),
        CONSTRAINT fk_crew_medical_checkins_camps_camp_id FOREIGN KEY (camp_id) REFERENCES camps (camp_id) ON DELETE RESTRICT,
        CONSTRAINT fk_crew_medical_checkins_crew_members_checked_in_by FOREIGN KEY (checked_in_by) REFERENCES crew_members (crew_id) ON DELETE RESTRICT,
        CONSTRAINT fk_crew_medical_checkins_crew_members_crew_id FOREIGN KEY (crew_id) REFERENCES crew_members (crew_id) ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260702195148_InitialCreate') THEN
    CREATE TABLE users (
        user_id uuid NOT NULL,
        crew_id uuid NOT NULL,
        email character varying(160) NOT NULL,
        password_hash text NOT NULL,
        role_permissions character varying(40) NOT NULL,
        last_login_at timestamp with time zone,
        is_active boolean NOT NULL,
        created_at timestamp with time zone NOT NULL,
        CONSTRAINT pk_users PRIMARY KEY (user_id),
        CONSTRAINT fk_users_crew_members_crew_id FOREIGN KEY (crew_id) REFERENCES crew_members (crew_id) ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260702195148_InitialCreate') THEN
    CREATE TABLE camper_assessments (
        assessment_id uuid NOT NULL,
        registration_id uuid NOT NULL,
        allergies text,
        eyesight text,
        hearing text,
        mobility_aids text,
        prosthesis text,
        adl_needs jsonb,
        symptom_flags jsonb,
        current_medications text,
        medication_handed_in boolean NOT NULL,
        physical_condition text,
        dietary_requirements text,
        religion character varying(40),
        additional_info text,
        viral_load character varying(40),
        vl_test_date date,
        tb_status character varying(20),
        hepatitis_b boolean,
        adherence_barriers text,
        assessed_by uuid NOT NULL,
        assessed_at timestamp with time zone NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by uuid,
        CONSTRAINT pk_camper_assessments PRIMARY KEY (assessment_id),
        CONSTRAINT "CK_CamperAssessment_DeletedAtDeletedBy" CHECK ((deleted_at IS NULL) = (deleted_by IS NULL)),
        CONSTRAINT fk_camper_assessments_camp_registrations_registration_id FOREIGN KEY (registration_id) REFERENCES camp_registrations (registration_id) ON DELETE CASCADE,
        CONSTRAINT fk_camper_assessments_crew_members_assessed_by FOREIGN KEY (assessed_by) REFERENCES crew_members (crew_id) ON DELETE RESTRICT,
        CONSTRAINT fk_camper_assessments_crew_members_deleted_by FOREIGN KEY (deleted_by) REFERENCES crew_members (crew_id) ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260702195148_InitialCreate') THEN
    CREATE TABLE consent_records (
        consent_id uuid NOT NULL,
        registration_id uuid NOT NULL,
        consent_type character varying(40) NOT NULL,
        signed_by character varying(160) NOT NULL,
        witness_name character varying(160),
        signed_at timestamp with time zone NOT NULL,
        signed_location character varying(120),
        document_url text,
        popia_acknowledged boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by uuid,
        CONSTRAINT pk_consent_records PRIMARY KEY (consent_id),
        CONSTRAINT "CK_ConsentRecord_DeletedAtDeletedBy" CHECK ((deleted_at IS NULL) = (deleted_by IS NULL)),
        CONSTRAINT fk_consent_records_camp_registrations_registration_id FOREIGN KEY (registration_id) REFERENCES camp_registrations (registration_id) ON DELETE CASCADE,
        CONSTRAINT fk_consent_records_crew_members_deleted_by FOREIGN KEY (deleted_by) REFERENCES crew_members (crew_id) ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260702195148_InitialCreate') THEN
    CREATE TABLE medication_events (
        event_id uuid NOT NULL,
        registration_id uuid NOT NULL,
        event_at timestamp with time zone NOT NULL,
        discovery_at timestamp with time zone NOT NULL,
        description text NOT NULL,
        event_types jsonb NOT NULL,
        contributing_factors jsonb,
        immediate_action text NOT NULL,
        doctor_notified text,
        treatment_ordered text,
        corrective_action text,
        reporter_id uuid NOT NULL,
        reviewer_id uuid,
        created_at timestamp with time zone NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by uuid,
        CONSTRAINT pk_medication_events PRIMARY KEY (event_id),
        CONSTRAINT "CK_MedicationEvent_DeletedAtDeletedBy" CHECK ((deleted_at IS NULL) = (deleted_by IS NULL)),
        CONSTRAINT fk_medication_events_camp_registrations_registration_id FOREIGN KEY (registration_id) REFERENCES camp_registrations (registration_id) ON DELETE CASCADE,
        CONSTRAINT fk_medication_events_crew_members_deleted_by FOREIGN KEY (deleted_by) REFERENCES crew_members (crew_id) ON DELETE RESTRICT,
        CONSTRAINT fk_medication_events_crew_members_reporter_id FOREIGN KEY (reporter_id) REFERENCES crew_members (crew_id) ON DELETE RESTRICT,
        CONSTRAINT fk_medication_events_crew_members_reviewer_id FOREIGN KEY (reviewer_id) REFERENCES crew_members (crew_id) ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260702195148_InitialCreate') THEN
    CREATE TABLE medshack_visits (
        visit_id uuid NOT NULL,
        registration_id uuid NOT NULL,
        visit_at timestamp with time zone NOT NULL,
        reason text NOT NULL,
        accompanied_by character varying(160),
        temperature numeric(4,1),
        pulse integer,
        blood_pressure character varying(20),
        oxygen_saturation integer,
        medical_history text,
        signs_symptoms text,
        findings text,
        nursing_report text,
        advice_given text,
        nurse_id uuid NOT NULL,
        doctor_id uuid,
        created_at timestamp with time zone NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by uuid,
        CONSTRAINT pk_medshack_visits PRIMARY KEY (visit_id),
        CONSTRAINT "CK_MedshackVisit_DeletedAtDeletedBy" CHECK ((deleted_at IS NULL) = (deleted_by IS NULL)),
        CONSTRAINT fk_medshack_visits_camp_registrations_registration_id FOREIGN KEY (registration_id) REFERENCES camp_registrations (registration_id) ON DELETE CASCADE,
        CONSTRAINT fk_medshack_visits_crew_members_deleted_by FOREIGN KEY (deleted_by) REFERENCES crew_members (crew_id) ON DELETE RESTRICT,
        CONSTRAINT fk_medshack_visits_crew_members_doctor_id FOREIGN KEY (doctor_id) REFERENCES crew_members (crew_id) ON DELETE RESTRICT,
        CONSTRAINT fk_medshack_visits_crew_members_nurse_id FOREIGN KEY (nurse_id) REFERENCES crew_members (crew_id) ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260702195148_InitialCreate') THEN
    CREATE TABLE prescriptions (
        prescription_id uuid NOT NULL,
        registration_id uuid NOT NULL,
        medication_name character varying(120) NOT NULL,
        dose character varying(60) NOT NULL,
        route character varying(40),
        frequency character varying(60) NOT NULL,
        scheduled_times jsonb NOT NULL,
        start_date date NOT NULL,
        end_date date,
        prescribed_by uuid,
        notes text,
        created_at timestamp with time zone NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by uuid,
        CONSTRAINT pk_prescriptions PRIMARY KEY (prescription_id),
        CONSTRAINT "CK_Prescription_DeletedAtDeletedBy" CHECK ((deleted_at IS NULL) = (deleted_by IS NULL)),
        CONSTRAINT fk_prescriptions_camp_registrations_registration_id FOREIGN KEY (registration_id) REFERENCES camp_registrations (registration_id) ON DELETE CASCADE,
        CONSTRAINT fk_prescriptions_crew_members_deleted_by FOREIGN KEY (deleted_by) REFERENCES crew_members (crew_id) ON DELETE RESTRICT,
        CONSTRAINT fk_prescriptions_crew_members_prescribed_by FOREIGN KEY (prescribed_by) REFERENCES crew_members (crew_id) ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260702195148_InitialCreate') THEN
    CREATE TABLE audit_logs (
        audit_id uuid NOT NULL,
        user_id uuid NOT NULL,
        entity_table character varying(40) NOT NULL,
        entity_id uuid NOT NULL,
        action character varying(20) NOT NULL,
        before_state jsonb,
        after_state jsonb,
        ip_address character varying(45),
        created_at timestamp with time zone NOT NULL,
        CONSTRAINT pk_audit_logs PRIMARY KEY (audit_id),
        CONSTRAINT fk_audit_logs_users_user_id FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260702195148_InitialCreate') THEN
    CREATE TABLE medshack_treatments (
        treatment_id uuid NOT NULL,
        visit_id uuid NOT NULL,
        sequence_no integer NOT NULL,
        treatment_time timestamp with time zone NOT NULL,
        treatment_description text NOT NULL,
        outcome text,
        administered_by uuid NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by uuid,
        CONSTRAINT pk_medshack_treatments PRIMARY KEY (treatment_id),
        CONSTRAINT "CK_MedshackTreatment_DeletedAtDeletedBy" CHECK ((deleted_at IS NULL) = (deleted_by IS NULL)),
        CONSTRAINT fk_medshack_treatments_crew_members_administered_by FOREIGN KEY (administered_by) REFERENCES crew_members (crew_id) ON DELETE RESTRICT,
        CONSTRAINT fk_medshack_treatments_crew_members_deleted_by FOREIGN KEY (deleted_by) REFERENCES crew_members (crew_id) ON DELETE RESTRICT,
        CONSTRAINT fk_medshack_treatments_medshack_visits_visit_id FOREIGN KEY (visit_id) REFERENCES medshack_visits (visit_id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260702195148_InitialCreate') THEN
    CREATE TABLE medication_doses (
        dose_id uuid NOT NULL,
        prescription_id uuid NOT NULL,
        scheduled_at timestamp with time zone NOT NULL,
        administered_at timestamp with time zone,
        administered_by uuid,
        status character varying(20) NOT NULL,
        notes text,
        created_at timestamp with time zone NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by uuid,
        CONSTRAINT pk_medication_doses PRIMARY KEY (dose_id),
        CONSTRAINT "CK_MedicationDose_DeletedAtDeletedBy" CHECK ((deleted_at IS NULL) = (deleted_by IS NULL)),
        CONSTRAINT fk_medication_doses_crew_members_administered_by FOREIGN KEY (administered_by) REFERENCES crew_members (crew_id) ON DELETE RESTRICT,
        CONSTRAINT fk_medication_doses_crew_members_deleted_by FOREIGN KEY (deleted_by) REFERENCES crew_members (crew_id) ON DELETE RESTRICT,
        CONSTRAINT fk_medication_doses_prescriptions_prescription_id FOREIGN KEY (prescription_id) REFERENCES prescriptions (prescription_id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260702195148_InitialCreate') THEN
    CREATE INDEX ix_audit_logs_user_id ON audit_logs (user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260702195148_InitialCreate') THEN
    CREATE INDEX ix_camp_registrations_camp_id ON camp_registrations (camp_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260702195148_InitialCreate') THEN
    CREATE INDEX ix_camp_registrations_camper_id ON camp_registrations (camper_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260702195148_InitialCreate') THEN
    CREATE INDEX ix_camper_assessments_assessed_by ON camper_assessments (assessed_by);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260702195148_InitialCreate') THEN
    CREATE INDEX ix_camper_assessments_deleted_by ON camper_assessments (deleted_by);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260702195148_InitialCreate') THEN
    CREATE UNIQUE INDEX ix_camper_assessments_registration_id ON camper_assessments (registration_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260702195148_InitialCreate') THEN
    CREATE UNIQUE INDEX ix_campers_file_number ON campers (file_number);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260702195148_InitialCreate') THEN
    CREATE UNIQUE INDEX ix_camps_camp_number ON camps (camp_number);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260702195148_InitialCreate') THEN
    CREATE INDEX ix_caregivers_camper_id ON caregivers (camper_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260702195148_InitialCreate') THEN
    CREATE INDEX ix_consent_records_deleted_by ON consent_records (deleted_by);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260702195148_InitialCreate') THEN
    CREATE INDEX ix_consent_records_registration_id ON consent_records (registration_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260702195148_InitialCreate') THEN
    CREATE INDEX ix_crew_medical_checkins_camp_id ON crew_medical_checkins (camp_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260702195148_InitialCreate') THEN
    CREATE INDEX ix_crew_medical_checkins_checked_in_by ON crew_medical_checkins (checked_in_by);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260702195148_InitialCreate') THEN
    CREATE INDEX ix_crew_medical_checkins_crew_id ON crew_medical_checkins (crew_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260702195148_InitialCreate') THEN
    CREATE UNIQUE INDEX ix_crew_members_id_number ON crew_members (id_number);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260702195148_InitialCreate') THEN
    CREATE INDEX ix_emergency_contacts_camper_id ON emergency_contacts (camper_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260702195148_InitialCreate') THEN
    CREATE INDEX ix_medication_doses_administered_by ON medication_doses (administered_by);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260702195148_InitialCreate') THEN
    CREATE INDEX ix_medication_doses_deleted_by ON medication_doses (deleted_by);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260702195148_InitialCreate') THEN
    CREATE INDEX ix_medication_doses_prescription_id ON medication_doses (prescription_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260702195148_InitialCreate') THEN
    CREATE INDEX ix_medication_events_deleted_by ON medication_events (deleted_by);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260702195148_InitialCreate') THEN
    CREATE INDEX ix_medication_events_registration_id ON medication_events (registration_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260702195148_InitialCreate') THEN
    CREATE INDEX ix_medication_events_reporter_id ON medication_events (reporter_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260702195148_InitialCreate') THEN
    CREATE INDEX ix_medication_events_reviewer_id ON medication_events (reviewer_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260702195148_InitialCreate') THEN
    CREATE INDEX ix_medshack_treatments_administered_by ON medshack_treatments (administered_by);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260702195148_InitialCreate') THEN
    CREATE INDEX ix_medshack_treatments_deleted_by ON medshack_treatments (deleted_by);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260702195148_InitialCreate') THEN
    CREATE INDEX ix_medshack_treatments_visit_id ON medshack_treatments (visit_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260702195148_InitialCreate') THEN
    CREATE INDEX ix_medshack_visits_deleted_by ON medshack_visits (deleted_by);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260702195148_InitialCreate') THEN
    CREATE INDEX ix_medshack_visits_doctor_id ON medshack_visits (doctor_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260702195148_InitialCreate') THEN
    CREATE INDEX ix_medshack_visits_nurse_id ON medshack_visits (nurse_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260702195148_InitialCreate') THEN
    CREATE INDEX ix_medshack_visits_registration_id ON medshack_visits (registration_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260702195148_InitialCreate') THEN
    CREATE INDEX ix_prescriptions_deleted_by ON prescriptions (deleted_by);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260702195148_InitialCreate') THEN
    CREATE INDEX ix_prescriptions_prescribed_by ON prescriptions (prescribed_by);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260702195148_InitialCreate') THEN
    CREATE INDEX ix_prescriptions_registration_id ON prescriptions (registration_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260702195148_InitialCreate') THEN
    CREATE UNIQUE INDEX ix_users_crew_id ON users (crew_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260702195148_InitialCreate') THEN
    CREATE UNIQUE INDEX ix_users_email ON users (email);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260702195148_InitialCreate') THEN
    INSERT INTO "__EFMigrationsHistory" (migration_id, product_version)
    VALUES ('20260702195148_InitialCreate', '8.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260702195506_AddSecurityLayer') THEN
    -- Enables Row-Level Security on every table and defines the one identity helper
    -- function that all policies in 002_rls_policies.sql depend on.
    --
    -- app_current_user_id(): resolves the Supabase Auth session (auth.uid()) to this
    -- app's own "users" row. Returns NULL if there is no session, or the session's
    -- auth uid has no matching (or an inactive) "users" row -- callers treat NULL as
    -- "not authorised" via `IS NOT NULL` checks in the policies themselves.
    --
    -- Assumption flagged for review: this assumes users.user_id IS the Supabase Auth
    -- uid (i.e. the "users" row is created with user_id = auth.uid() at signup, in
    -- layer 3). If layer 3 instead stores the auth uid in a separate column, this
    -- function's WHERE clause needs to change to match -- everything else is unaffected.
    CREATE OR REPLACE FUNCTION app_current_user_id()
    RETURNS uuid
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
        SELECT user_id
        FROM users
        WHERE user_id = auth.uid()
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

    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260702195506_AddSecurityLayer') THEN
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

    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260702195506_AddSecurityLayer') THEN
    -- DB-level immutability for the 7 clinical tables. This is the hard requirement:
    -- a direct SQL connection or a compromised API must not be able to alter or hard-
    -- delete a signed clinical record, no matter what RLS or app-layer RBAC say.
    --
    -- One generic trigger function, reused identically across all 7 tables:
    --   - DELETE is unconditionally rejected.
    --   - UPDATE is rejected unless the only columns that changed are deleted_at and
    --     deleted_by (the soft-delete flags). Every other column, on every one of these
    --     tables, is write-once.
    CREATE OR REPLACE FUNCTION enforce_clinical_immutability()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
        IF TG_OP = 'DELETE' THEN
            RAISE EXCEPTION 'Hard delete is not permitted on %; use the soft-delete flag columns.', TG_TABLE_NAME;
        END IF;

        IF (to_jsonb(OLD) - 'deleted_at' - 'deleted_by')
            IS DISTINCT FROM
           (to_jsonb(NEW) - 'deleted_at' - 'deleted_by') THEN
            RAISE EXCEPTION 'Only deleted_at/deleted_by may be updated on %; all other columns are immutable.', TG_TABLE_NAME;
        END IF;

        RETURN NEW;
    END;
    $$;

    CREATE TRIGGER trg_camper_assessments_immutability
        BEFORE UPDATE OR DELETE ON camper_assessments
        FOR EACH ROW EXECUTE FUNCTION enforce_clinical_immutability();

    CREATE TRIGGER trg_consent_records_immutability
        BEFORE UPDATE OR DELETE ON consent_records
        FOR EACH ROW EXECUTE FUNCTION enforce_clinical_immutability();

    CREATE TRIGGER trg_prescriptions_immutability
        BEFORE UPDATE OR DELETE ON prescriptions
        FOR EACH ROW EXECUTE FUNCTION enforce_clinical_immutability();

    CREATE TRIGGER trg_medication_doses_immutability
        BEFORE UPDATE OR DELETE ON medication_doses
        FOR EACH ROW EXECUTE FUNCTION enforce_clinical_immutability();

    CREATE TRIGGER trg_medshack_visits_immutability
        BEFORE UPDATE OR DELETE ON medshack_visits
        FOR EACH ROW EXECUTE FUNCTION enforce_clinical_immutability();

    CREATE TRIGGER trg_medshack_treatments_immutability
        BEFORE UPDATE OR DELETE ON medshack_treatments
        FOR EACH ROW EXECUTE FUNCTION enforce_clinical_immutability();

    CREATE TRIGGER trg_medication_events_immutability
        BEFORE UPDATE OR DELETE ON medication_events
        FOR EACH ROW EXECUTE FUNCTION enforce_clinical_immutability();

    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260702195506_AddSecurityLayer') THEN
    -- audit_logs is append-only at the DB level: INSERT allowed, UPDATE and DELETE
    -- blocked unconditionally. Unlike the clinical tables, there's no flag-column
    -- exception here -- audit_logs has no soft-delete columns, nothing about an audit
    -- entry is ever meant to change once written.
    CREATE OR REPLACE FUNCTION block_audit_log_mutation()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
        RAISE EXCEPTION 'audit_logs is append-only; % is not permitted.', TG_OP;
    END;
    $$;

    CREATE TRIGGER trg_audit_logs_append_only
        BEFORE UPDATE OR DELETE ON audit_logs
        FOR EACH ROW EXECUTE FUNCTION block_audit_log_mutation();

    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260702195506_AddSecurityLayer') THEN
    INSERT INTO "__EFMigrationsHistory" (migration_id, product_version)
    VALUES ('20260702195506_AddSecurityLayer', '8.0.11');
    END IF;
END $EF$;
COMMIT;

