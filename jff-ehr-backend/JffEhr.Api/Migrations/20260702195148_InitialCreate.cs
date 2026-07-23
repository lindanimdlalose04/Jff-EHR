using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JffEhr.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "campers",
                columns: table => new
                {
                    camper_id = table.Column<Guid>(type: "uuid", nullable: false),
                    first_name = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    surname = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    dob = table.Column<DateOnly>(type: "date", nullable: false),
                    sex = table.Column<string>(type: "character varying(8)", maxLength: 8, nullable: false),
                    race = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    address = table.Column<string>(type: "text", nullable: true),
                    cell_number = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    language = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    t_shirt_size = table.Column<string>(type: "character varying(8)", maxLength: 8, nullable: true),
                    photo_url = table.Column<string>(type: "text", nullable: true),
                    diagnosis = table.Column<string>(type: "text", nullable: true),
                    treating_clinic = table.Column<string>(type: "text", nullable: true),
                    file_number = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    family_group_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_campers", x => x.camper_id);
                });

            migrationBuilder.CreateTable(
                name: "camps",
                columns: table => new
                {
                    camp_id = table.Column<Guid>(type: "uuid", nullable: false),
                    camp_number = table.Column<int>(type: "integer", nullable: false),
                    start_date = table.Column<DateOnly>(type: "date", nullable: false),
                    end_date = table.Column<DateOnly>(type: "date", nullable: false),
                    venue = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    province = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    camp_type = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_camps", x => x.camp_id);
                });

            migrationBuilder.CreateTable(
                name: "crew_members",
                columns: table => new
                {
                    crew_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    surname = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    id_number = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    dob = table.Column<DateOnly>(type: "date", nullable: true),
                    role = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    photo_url = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_crew_members", x => x.crew_id);
                });

            migrationBuilder.CreateTable(
                name: "caregivers",
                columns: table => new
                {
                    caregiver_id = table.Column<Guid>(type: "uuid", nullable: false),
                    camper_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    cell_no = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    work_no = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    relationship = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    is_primary = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_caregivers", x => x.caregiver_id);
                    table.ForeignKey(
                        name: "fk_caregivers_campers_camper_id",
                        column: x => x.camper_id,
                        principalTable: "campers",
                        principalColumn: "camper_id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "emergency_contacts",
                columns: table => new
                {
                    contact_id = table.Column<Guid>(type: "uuid", nullable: false),
                    camper_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    cell_no = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    work_no = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    relationship = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_emergency_contacts", x => x.contact_id);
                    table.ForeignKey(
                        name: "fk_emergency_contacts_campers_camper_id",
                        column: x => x.camper_id,
                        principalTable: "campers",
                        principalColumn: "camper_id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "camp_registrations",
                columns: table => new
                {
                    registration_id = table.Column<Guid>(type: "uuid", nullable: false),
                    camp_id = table.Column<Guid>(type: "uuid", nullable: false),
                    camper_id = table.Column<Guid>(type: "uuid", nullable: false),
                    cabin = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    group_name = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    registered_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_camp_registrations", x => x.registration_id);
                    table.ForeignKey(
                        name: "fk_camp_registrations_campers_camper_id",
                        column: x => x.camper_id,
                        principalTable: "campers",
                        principalColumn: "camper_id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_camp_registrations_camps_camp_id",
                        column: x => x.camp_id,
                        principalTable: "camps",
                        principalColumn: "camp_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "crew_medical_checkins",
                columns: table => new
                {
                    checkin_id = table.Column<Guid>(type: "uuid", nullable: false),
                    crew_id = table.Column<Guid>(type: "uuid", nullable: false),
                    camp_id = table.Column<Guid>(type: "uuid", nullable: false),
                    allergies = table.Column<string>(type: "text", nullable: true),
                    has_broviac_port = table.Column<bool>(type: "boolean", nullable: false),
                    eyesight = table.Column<string>(type: "text", nullable: true),
                    hearing = table.Column<string>(type: "text", nullable: true),
                    mobility_aids = table.Column<string>(type: "text", nullable: true),
                    current_medications = table.Column<string>(type: "text", nullable: true),
                    medical_release_signed = table.Column<bool>(type: "boolean", nullable: false),
                    checked_in_by = table.Column<Guid>(type: "uuid", nullable: false),
                    checked_in_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_crew_medical_checkins", x => x.checkin_id);
                    table.ForeignKey(
                        name: "fk_crew_medical_checkins_camps_camp_id",
                        column: x => x.camp_id,
                        principalTable: "camps",
                        principalColumn: "camp_id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_crew_medical_checkins_crew_members_checked_in_by",
                        column: x => x.checked_in_by,
                        principalTable: "crew_members",
                        principalColumn: "crew_id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_crew_medical_checkins_crew_members_crew_id",
                        column: x => x.crew_id,
                        principalTable: "crew_members",
                        principalColumn: "crew_id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    crew_id = table.Column<Guid>(type: "uuid", nullable: false),
                    email = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    password_hash = table.Column<string>(type: "text", nullable: false),
                    role_permissions = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    last_login_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_users", x => x.user_id);
                    table.ForeignKey(
                        name: "fk_users_crew_members_crew_id",
                        column: x => x.crew_id,
                        principalTable: "crew_members",
                        principalColumn: "crew_id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "camper_assessments",
                columns: table => new
                {
                    assessment_id = table.Column<Guid>(type: "uuid", nullable: false),
                    registration_id = table.Column<Guid>(type: "uuid", nullable: false),
                    allergies = table.Column<string>(type: "text", nullable: true),
                    eyesight = table.Column<string>(type: "text", nullable: true),
                    hearing = table.Column<string>(type: "text", nullable: true),
                    mobility_aids = table.Column<string>(type: "text", nullable: true),
                    prosthesis = table.Column<string>(type: "text", nullable: true),
                    adl_needs = table.Column<string>(type: "jsonb", nullable: true),
                    symptom_flags = table.Column<string>(type: "jsonb", nullable: true),
                    current_medications = table.Column<string>(type: "text", nullable: true),
                    medication_handed_in = table.Column<bool>(type: "boolean", nullable: false),
                    physical_condition = table.Column<string>(type: "text", nullable: true),
                    dietary_requirements = table.Column<string>(type: "text", nullable: true),
                    religion = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    additional_info = table.Column<string>(type: "text", nullable: true),
                    viral_load = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    vl_test_date = table.Column<DateOnly>(type: "date", nullable: true),
                    tb_status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    hepatitis_b = table.Column<bool>(type: "boolean", nullable: true),
                    adherence_barriers = table.Column<string>(type: "text", nullable: true),
                    assessed_by = table.Column<Guid>(type: "uuid", nullable: false),
                    assessed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    deleted_by = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_camper_assessments", x => x.assessment_id);
                    table.CheckConstraint("CK_CamperAssessment_DeletedAtDeletedBy", "(deleted_at IS NULL) = (deleted_by IS NULL)");
                    table.ForeignKey(
                        name: "fk_camper_assessments_camp_registrations_registration_id",
                        column: x => x.registration_id,
                        principalTable: "camp_registrations",
                        principalColumn: "registration_id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_camper_assessments_crew_members_assessed_by",
                        column: x => x.assessed_by,
                        principalTable: "crew_members",
                        principalColumn: "crew_id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_camper_assessments_crew_members_deleted_by",
                        column: x => x.deleted_by,
                        principalTable: "crew_members",
                        principalColumn: "crew_id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "consent_records",
                columns: table => new
                {
                    consent_id = table.Column<Guid>(type: "uuid", nullable: false),
                    registration_id = table.Column<Guid>(type: "uuid", nullable: false),
                    consent_type = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    signed_by = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    witness_name = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: true),
                    signed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    signed_location = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    document_url = table.Column<string>(type: "text", nullable: true),
                    popia_acknowledged = table.Column<bool>(type: "boolean", nullable: false),
                    deleted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    deleted_by = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_consent_records", x => x.consent_id);
                    table.CheckConstraint("CK_ConsentRecord_DeletedAtDeletedBy", "(deleted_at IS NULL) = (deleted_by IS NULL)");
                    table.ForeignKey(
                        name: "fk_consent_records_camp_registrations_registration_id",
                        column: x => x.registration_id,
                        principalTable: "camp_registrations",
                        principalColumn: "registration_id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_consent_records_crew_members_deleted_by",
                        column: x => x.deleted_by,
                        principalTable: "crew_members",
                        principalColumn: "crew_id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "medication_events",
                columns: table => new
                {
                    event_id = table.Column<Guid>(type: "uuid", nullable: false),
                    registration_id = table.Column<Guid>(type: "uuid", nullable: false),
                    event_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    discovery_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    description = table.Column<string>(type: "text", nullable: false),
                    event_types = table.Column<string>(type: "jsonb", nullable: false),
                    contributing_factors = table.Column<string>(type: "jsonb", nullable: true),
                    immediate_action = table.Column<string>(type: "text", nullable: false),
                    doctor_notified = table.Column<string>(type: "text", nullable: true),
                    treatment_ordered = table.Column<string>(type: "text", nullable: true),
                    corrective_action = table.Column<string>(type: "text", nullable: true),
                    reporter_id = table.Column<Guid>(type: "uuid", nullable: false),
                    reviewer_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    deleted_by = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_medication_events", x => x.event_id);
                    table.CheckConstraint("CK_MedicationEvent_DeletedAtDeletedBy", "(deleted_at IS NULL) = (deleted_by IS NULL)");
                    table.ForeignKey(
                        name: "fk_medication_events_camp_registrations_registration_id",
                        column: x => x.registration_id,
                        principalTable: "camp_registrations",
                        principalColumn: "registration_id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_medication_events_crew_members_deleted_by",
                        column: x => x.deleted_by,
                        principalTable: "crew_members",
                        principalColumn: "crew_id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_medication_events_crew_members_reporter_id",
                        column: x => x.reporter_id,
                        principalTable: "crew_members",
                        principalColumn: "crew_id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_medication_events_crew_members_reviewer_id",
                        column: x => x.reviewer_id,
                        principalTable: "crew_members",
                        principalColumn: "crew_id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "medshack_visits",
                columns: table => new
                {
                    visit_id = table.Column<Guid>(type: "uuid", nullable: false),
                    registration_id = table.Column<Guid>(type: "uuid", nullable: false),
                    visit_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    reason = table.Column<string>(type: "text", nullable: false),
                    accompanied_by = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: true),
                    temperature = table.Column<decimal>(type: "numeric(4,1)", nullable: true),
                    pulse = table.Column<int>(type: "integer", nullable: true),
                    blood_pressure = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    oxygen_saturation = table.Column<int>(type: "integer", nullable: true),
                    medical_history = table.Column<string>(type: "text", nullable: true),
                    signs_symptoms = table.Column<string>(type: "text", nullable: true),
                    findings = table.Column<string>(type: "text", nullable: true),
                    nursing_report = table.Column<string>(type: "text", nullable: true),
                    advice_given = table.Column<string>(type: "text", nullable: true),
                    nurse_id = table.Column<Guid>(type: "uuid", nullable: false),
                    doctor_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    deleted_by = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_medshack_visits", x => x.visit_id);
                    table.CheckConstraint("CK_MedshackVisit_DeletedAtDeletedBy", "(deleted_at IS NULL) = (deleted_by IS NULL)");
                    table.ForeignKey(
                        name: "fk_medshack_visits_camp_registrations_registration_id",
                        column: x => x.registration_id,
                        principalTable: "camp_registrations",
                        principalColumn: "registration_id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_medshack_visits_crew_members_deleted_by",
                        column: x => x.deleted_by,
                        principalTable: "crew_members",
                        principalColumn: "crew_id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_medshack_visits_crew_members_doctor_id",
                        column: x => x.doctor_id,
                        principalTable: "crew_members",
                        principalColumn: "crew_id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_medshack_visits_crew_members_nurse_id",
                        column: x => x.nurse_id,
                        principalTable: "crew_members",
                        principalColumn: "crew_id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "prescriptions",
                columns: table => new
                {
                    prescription_id = table.Column<Guid>(type: "uuid", nullable: false),
                    registration_id = table.Column<Guid>(type: "uuid", nullable: false),
                    medication_name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    dose = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    route = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    frequency = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    scheduled_times = table.Column<string>(type: "jsonb", nullable: false),
                    start_date = table.Column<DateOnly>(type: "date", nullable: false),
                    end_date = table.Column<DateOnly>(type: "date", nullable: true),
                    prescribed_by = table.Column<Guid>(type: "uuid", nullable: true),
                    notes = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    deleted_by = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_prescriptions", x => x.prescription_id);
                    table.CheckConstraint("CK_Prescription_DeletedAtDeletedBy", "(deleted_at IS NULL) = (deleted_by IS NULL)");
                    table.ForeignKey(
                        name: "fk_prescriptions_camp_registrations_registration_id",
                        column: x => x.registration_id,
                        principalTable: "camp_registrations",
                        principalColumn: "registration_id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_prescriptions_crew_members_deleted_by",
                        column: x => x.deleted_by,
                        principalTable: "crew_members",
                        principalColumn: "crew_id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_prescriptions_crew_members_prescribed_by",
                        column: x => x.prescribed_by,
                        principalTable: "crew_members",
                        principalColumn: "crew_id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "audit_logs",
                columns: table => new
                {
                    audit_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    entity_table = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    entity_id = table.Column<Guid>(type: "uuid", nullable: false),
                    action = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    before_state = table.Column<string>(type: "jsonb", nullable: true),
                    after_state = table.Column<string>(type: "jsonb", nullable: true),
                    ip_address = table.Column<string>(type: "character varying(45)", maxLength: 45, nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_audit_logs", x => x.audit_id);
                    table.ForeignKey(
                        name: "fk_audit_logs_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "user_id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "medshack_treatments",
                columns: table => new
                {
                    treatment_id = table.Column<Guid>(type: "uuid", nullable: false),
                    visit_id = table.Column<Guid>(type: "uuid", nullable: false),
                    sequence_no = table.Column<int>(type: "integer", nullable: false),
                    treatment_time = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    treatment_description = table.Column<string>(type: "text", nullable: false),
                    outcome = table.Column<string>(type: "text", nullable: true),
                    administered_by = table.Column<Guid>(type: "uuid", nullable: false),
                    deleted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    deleted_by = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_medshack_treatments", x => x.treatment_id);
                    table.CheckConstraint("CK_MedshackTreatment_DeletedAtDeletedBy", "(deleted_at IS NULL) = (deleted_by IS NULL)");
                    table.ForeignKey(
                        name: "fk_medshack_treatments_crew_members_administered_by",
                        column: x => x.administered_by,
                        principalTable: "crew_members",
                        principalColumn: "crew_id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_medshack_treatments_crew_members_deleted_by",
                        column: x => x.deleted_by,
                        principalTable: "crew_members",
                        principalColumn: "crew_id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_medshack_treatments_medshack_visits_visit_id",
                        column: x => x.visit_id,
                        principalTable: "medshack_visits",
                        principalColumn: "visit_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "medication_doses",
                columns: table => new
                {
                    dose_id = table.Column<Guid>(type: "uuid", nullable: false),
                    prescription_id = table.Column<Guid>(type: "uuid", nullable: false),
                    scheduled_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    administered_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    administered_by = table.Column<Guid>(type: "uuid", nullable: true),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    notes = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    deleted_by = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_medication_doses", x => x.dose_id);
                    table.CheckConstraint("CK_MedicationDose_DeletedAtDeletedBy", "(deleted_at IS NULL) = (deleted_by IS NULL)");
                    table.ForeignKey(
                        name: "fk_medication_doses_crew_members_administered_by",
                        column: x => x.administered_by,
                        principalTable: "crew_members",
                        principalColumn: "crew_id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_medication_doses_crew_members_deleted_by",
                        column: x => x.deleted_by,
                        principalTable: "crew_members",
                        principalColumn: "crew_id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_medication_doses_prescriptions_prescription_id",
                        column: x => x.prescription_id,
                        principalTable: "prescriptions",
                        principalColumn: "prescription_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_audit_logs_user_id",
                table: "audit_logs",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ix_camp_registrations_camp_id",
                table: "camp_registrations",
                column: "camp_id");

            migrationBuilder.CreateIndex(
                name: "ix_camp_registrations_camper_id",
                table: "camp_registrations",
                column: "camper_id");

            migrationBuilder.CreateIndex(
                name: "ix_camper_assessments_assessed_by",
                table: "camper_assessments",
                column: "assessed_by");

            migrationBuilder.CreateIndex(
                name: "ix_camper_assessments_deleted_by",
                table: "camper_assessments",
                column: "deleted_by");

            migrationBuilder.CreateIndex(
                name: "ix_camper_assessments_registration_id",
                table: "camper_assessments",
                column: "registration_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_campers_file_number",
                table: "campers",
                column: "file_number",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_camps_camp_number",
                table: "camps",
                column: "camp_number",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_caregivers_camper_id",
                table: "caregivers",
                column: "camper_id");

            migrationBuilder.CreateIndex(
                name: "ix_consent_records_deleted_by",
                table: "consent_records",
                column: "deleted_by");

            migrationBuilder.CreateIndex(
                name: "ix_consent_records_registration_id",
                table: "consent_records",
                column: "registration_id");

            migrationBuilder.CreateIndex(
                name: "ix_crew_medical_checkins_camp_id",
                table: "crew_medical_checkins",
                column: "camp_id");

            migrationBuilder.CreateIndex(
                name: "ix_crew_medical_checkins_checked_in_by",
                table: "crew_medical_checkins",
                column: "checked_in_by");

            migrationBuilder.CreateIndex(
                name: "ix_crew_medical_checkins_crew_id",
                table: "crew_medical_checkins",
                column: "crew_id");

            migrationBuilder.CreateIndex(
                name: "ix_crew_members_id_number",
                table: "crew_members",
                column: "id_number",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_emergency_contacts_camper_id",
                table: "emergency_contacts",
                column: "camper_id");

            migrationBuilder.CreateIndex(
                name: "ix_medication_doses_administered_by",
                table: "medication_doses",
                column: "administered_by");

            migrationBuilder.CreateIndex(
                name: "ix_medication_doses_deleted_by",
                table: "medication_doses",
                column: "deleted_by");

            migrationBuilder.CreateIndex(
                name: "ix_medication_doses_prescription_id",
                table: "medication_doses",
                column: "prescription_id");

            migrationBuilder.CreateIndex(
                name: "ix_medication_events_deleted_by",
                table: "medication_events",
                column: "deleted_by");

            migrationBuilder.CreateIndex(
                name: "ix_medication_events_registration_id",
                table: "medication_events",
                column: "registration_id");

            migrationBuilder.CreateIndex(
                name: "ix_medication_events_reporter_id",
                table: "medication_events",
                column: "reporter_id");

            migrationBuilder.CreateIndex(
                name: "ix_medication_events_reviewer_id",
                table: "medication_events",
                column: "reviewer_id");

            migrationBuilder.CreateIndex(
                name: "ix_medshack_treatments_administered_by",
                table: "medshack_treatments",
                column: "administered_by");

            migrationBuilder.CreateIndex(
                name: "ix_medshack_treatments_deleted_by",
                table: "medshack_treatments",
                column: "deleted_by");

            migrationBuilder.CreateIndex(
                name: "ix_medshack_treatments_visit_id",
                table: "medshack_treatments",
                column: "visit_id");

            migrationBuilder.CreateIndex(
                name: "ix_medshack_visits_deleted_by",
                table: "medshack_visits",
                column: "deleted_by");

            migrationBuilder.CreateIndex(
                name: "ix_medshack_visits_doctor_id",
                table: "medshack_visits",
                column: "doctor_id");

            migrationBuilder.CreateIndex(
                name: "ix_medshack_visits_nurse_id",
                table: "medshack_visits",
                column: "nurse_id");

            migrationBuilder.CreateIndex(
                name: "ix_medshack_visits_registration_id",
                table: "medshack_visits",
                column: "registration_id");

            migrationBuilder.CreateIndex(
                name: "ix_prescriptions_deleted_by",
                table: "prescriptions",
                column: "deleted_by");

            migrationBuilder.CreateIndex(
                name: "ix_prescriptions_prescribed_by",
                table: "prescriptions",
                column: "prescribed_by");

            migrationBuilder.CreateIndex(
                name: "ix_prescriptions_registration_id",
                table: "prescriptions",
                column: "registration_id");

            migrationBuilder.CreateIndex(
                name: "ix_users_crew_id",
                table: "users",
                column: "crew_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_users_email",
                table: "users",
                column: "email",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "audit_logs");

            migrationBuilder.DropTable(
                name: "camper_assessments");

            migrationBuilder.DropTable(
                name: "caregivers");

            migrationBuilder.DropTable(
                name: "consent_records");

            migrationBuilder.DropTable(
                name: "crew_medical_checkins");

            migrationBuilder.DropTable(
                name: "emergency_contacts");

            migrationBuilder.DropTable(
                name: "medication_doses");

            migrationBuilder.DropTable(
                name: "medication_events");

            migrationBuilder.DropTable(
                name: "medshack_treatments");

            migrationBuilder.DropTable(
                name: "users");

            migrationBuilder.DropTable(
                name: "prescriptions");

            migrationBuilder.DropTable(
                name: "medshack_visits");

            migrationBuilder.DropTable(
                name: "camp_registrations");

            migrationBuilder.DropTable(
                name: "crew_members");

            migrationBuilder.DropTable(
                name: "campers");

            migrationBuilder.DropTable(
                name: "camps");
        }
    }
}
