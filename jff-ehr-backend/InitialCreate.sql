CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    migration_id character varying(150) NOT NULL,
    product_version character varying(32) NOT NULL,
    CONSTRAINT pk___ef_migrations_history PRIMARY KEY (migration_id)
);

START TRANSACTION;

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

CREATE INDEX ix_audit_logs_user_id ON audit_logs (user_id);

CREATE INDEX ix_camp_registrations_camp_id ON camp_registrations (camp_id);

CREATE INDEX ix_camp_registrations_camper_id ON camp_registrations (camper_id);

CREATE INDEX ix_camper_assessments_assessed_by ON camper_assessments (assessed_by);

CREATE INDEX ix_camper_assessments_deleted_by ON camper_assessments (deleted_by);

CREATE UNIQUE INDEX ix_camper_assessments_registration_id ON camper_assessments (registration_id);

CREATE UNIQUE INDEX ix_campers_file_number ON campers (file_number);

CREATE UNIQUE INDEX ix_camps_camp_number ON camps (camp_number);

CREATE INDEX ix_caregivers_camper_id ON caregivers (camper_id);

CREATE INDEX ix_consent_records_deleted_by ON consent_records (deleted_by);

CREATE INDEX ix_consent_records_registration_id ON consent_records (registration_id);

CREATE INDEX ix_crew_medical_checkins_camp_id ON crew_medical_checkins (camp_id);

CREATE INDEX ix_crew_medical_checkins_checked_in_by ON crew_medical_checkins (checked_in_by);

CREATE INDEX ix_crew_medical_checkins_crew_id ON crew_medical_checkins (crew_id);

CREATE UNIQUE INDEX ix_crew_members_id_number ON crew_members (id_number);

CREATE INDEX ix_emergency_contacts_camper_id ON emergency_contacts (camper_id);

CREATE INDEX ix_medication_doses_administered_by ON medication_doses (administered_by);

CREATE INDEX ix_medication_doses_deleted_by ON medication_doses (deleted_by);

CREATE INDEX ix_medication_doses_prescription_id ON medication_doses (prescription_id);

CREATE INDEX ix_medication_events_deleted_by ON medication_events (deleted_by);

CREATE INDEX ix_medication_events_registration_id ON medication_events (registration_id);

CREATE INDEX ix_medication_events_reporter_id ON medication_events (reporter_id);

CREATE INDEX ix_medication_events_reviewer_id ON medication_events (reviewer_id);

CREATE INDEX ix_medshack_treatments_administered_by ON medshack_treatments (administered_by);

CREATE INDEX ix_medshack_treatments_deleted_by ON medshack_treatments (deleted_by);

CREATE INDEX ix_medshack_treatments_visit_id ON medshack_treatments (visit_id);

CREATE INDEX ix_medshack_visits_deleted_by ON medshack_visits (deleted_by);

CREATE INDEX ix_medshack_visits_doctor_id ON medshack_visits (doctor_id);

CREATE INDEX ix_medshack_visits_nurse_id ON medshack_visits (nurse_id);

CREATE INDEX ix_medshack_visits_registration_id ON medshack_visits (registration_id);

CREATE INDEX ix_prescriptions_deleted_by ON prescriptions (deleted_by);

CREATE INDEX ix_prescriptions_prescribed_by ON prescriptions (prescribed_by);

CREATE INDEX ix_prescriptions_registration_id ON prescriptions (registration_id);

CREATE UNIQUE INDEX ix_users_crew_id ON users (crew_id);

CREATE UNIQUE INDEX ix_users_email ON users (email);

INSERT INTO "__EFMigrationsHistory" (migration_id, product_version)
VALUES ('20260702195148_InitialCreate', '8.0.11');

COMMIT;

