using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JffEhr.Api.Migrations
{
    /// <summary>
    /// Refinement A + B + the RLS/auth fix, as one migration:
    ///  - splits camper_assessments into precamp_medicals (the caregiver's pre-camp
    ///    medical half, one per registration) and arrival_checks (the nurse's day-one
    ///    check with the draft -> signed lock),
    ///  - copies existing assessment rows into both new tables (migrated rows arrive
    ///    as signed, since they represented completed assessments), then drops the
    ///    old table,
    ///  - applies 005 (new-table triggers/grants) and 006 (role-based RLS rewrite,
    ///    app_user_role(), audit_logs off auth.uid()).
    /// </summary>
    public partial class SplitAssessmentAddRoleRls : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "arrival_checks",
                columns: table => new
                {
                    arrival_check_id = table.Column<Guid>(type: "uuid", nullable: false),
                    registration_id = table.Column<Guid>(type: "uuid", nullable: false),
                    has_allergies = table.Column<bool>(type: "boolean", nullable: false),
                    allergies_detail = table.Column<string>(type: "text", nullable: true),
                    eyesight = table.Column<string>(type: "text", nullable: true),
                    hearing = table.Column<string>(type: "text", nullable: true),
                    mobility_aids = table.Column<string>(type: "text", nullable: true),
                    prosthesis = table.Column<string>(type: "text", nullable: true),
                    other_notes = table.Column<string>(type: "text", nullable: true),
                    adl_needs = table.Column<string>(type: "jsonb", nullable: true),
                    tb_screening = table.Column<string>(type: "jsonb", nullable: true),
                    has_medication = table.Column<bool>(type: "boolean", nullable: false),
                    medication_handed_in = table.Column<bool>(type: "boolean", nullable: false),
                    medication_handed_in_date = table.Column<DateOnly>(type: "date", nullable: true),
                    medication_list = table.Column<string>(type: "jsonb", nullable: true),
                    physical_condition = table.Column<string>(type: "text", nullable: true),
                    additional_notes = table.Column<string>(type: "text", nullable: true),
                    status = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    assessed_by = table.Column<Guid>(type: "uuid", nullable: false),
                    assessed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    signed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    signed_by = table.Column<Guid>(type: "uuid", nullable: true),
                    deleted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    deleted_by = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_arrival_checks", x => x.arrival_check_id);
                    table.CheckConstraint("CK_ArrivalCheck_DeletedAtDeletedBy", "(deleted_at IS NULL) = (deleted_by IS NULL)");
                    table.CheckConstraint("CK_ArrivalCheck_SignedStamps", "(status = 'signed') = (signed_at IS NOT NULL AND signed_by IS NOT NULL)");
                    table.CheckConstraint("CK_ArrivalCheck_Status", "status IN ('draft', 'signed')");
                    table.ForeignKey(
                        name: "fk_arrival_checks_camp_registrations_registration_id",
                        column: x => x.registration_id,
                        principalTable: "camp_registrations",
                        principalColumn: "registration_id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_arrival_checks_crew_members_assessed_by",
                        column: x => x.assessed_by,
                        principalTable: "crew_members",
                        principalColumn: "crew_id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_arrival_checks_crew_members_deleted_by",
                        column: x => x.deleted_by,
                        principalTable: "crew_members",
                        principalColumn: "crew_id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_arrival_checks_crew_members_signed_by",
                        column: x => x.signed_by,
                        principalTable: "crew_members",
                        principalColumn: "crew_id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "precamp_medicals",
                columns: table => new
                {
                    precamp_id = table.Column<Guid>(type: "uuid", nullable: false),
                    registration_id = table.Column<Guid>(type: "uuid", nullable: false),
                    diagnosis = table.Column<string>(type: "text", nullable: true),
                    hospital_file_number = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    treating_contact = table.Column<string>(type: "text", nullable: true),
                    vl_over1000 = table.Column<bool>(type: "boolean", nullable: true),
                    viral_load = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    vl_test_date = table.Column<DateOnly>(type: "date", nullable: true),
                    vl_date_received = table.Column<DateOnly>(type: "date", nullable: true),
                    clinical_findings = table.Column<string>(type: "text", nullable: true),
                    tb_status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    hepatitis_b = table.Column<bool>(type: "boolean", nullable: true),
                    tb_ois_history = table.Column<bool>(type: "boolean", nullable: false),
                    tb_ois_history_detail = table.Column<string>(type: "text", nullable: true),
                    medication_list = table.Column<string>(type: "jsonb", nullable: true),
                    adherence_barriers = table.Column<bool>(type: "boolean", nullable: false),
                    adherence_barriers_detail = table.Column<string>(type: "text", nullable: true),
                    dietary_requirements = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    religion = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    additional_info = table.Column<string>(type: "text", nullable: true),
                    camper_history_notes = table.Column<string>(type: "text", nullable: true),
                    captured_by = table.Column<Guid>(type: "uuid", nullable: false),
                    captured_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    deleted_by = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_precamp_medicals", x => x.precamp_id);
                    table.CheckConstraint("CK_PrecampMedical_DeletedAtDeletedBy", "(deleted_at IS NULL) = (deleted_by IS NULL)");
                    table.ForeignKey(
                        name: "fk_precamp_medicals_camp_registrations_registration_id",
                        column: x => x.registration_id,
                        principalTable: "camp_registrations",
                        principalColumn: "registration_id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_precamp_medicals_crew_members_captured_by",
                        column: x => x.captured_by,
                        principalTable: "crew_members",
                        principalColumn: "crew_id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_precamp_medicals_crew_members_deleted_by",
                        column: x => x.deleted_by,
                        principalTable: "crew_members",
                        principalColumn: "crew_id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_arrival_checks_assessed_by",
                table: "arrival_checks",
                column: "assessed_by");

            migrationBuilder.CreateIndex(
                name: "ix_arrival_checks_deleted_by",
                table: "arrival_checks",
                column: "deleted_by");

            migrationBuilder.CreateIndex(
                name: "ix_arrival_checks_registration_id",
                table: "arrival_checks",
                column: "registration_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_arrival_checks_signed_by",
                table: "arrival_checks",
                column: "signed_by");

            migrationBuilder.CreateIndex(
                name: "ix_precamp_medicals_captured_by",
                table: "precamp_medicals",
                column: "captured_by");

            migrationBuilder.CreateIndex(
                name: "ix_precamp_medicals_deleted_by",
                table: "precamp_medicals",
                column: "deleted_by");

            migrationBuilder.CreateIndex(
                name: "ix_precamp_medicals_registration_id",
                table: "precamp_medicals",
                column: "registration_id",
                unique: true);

            // Data move: each old assessment row becomes one pre-camp medical (the
            // HIV/TB block plus the overlap fields it now owns) and one signed
            // arrival check (everything the nurse captured on day one).
            migrationBuilder.Sql("""
                INSERT INTO precamp_medicals (
                    precamp_id, registration_id, viral_load, vl_test_date, tb_status,
                    hepatitis_b, tb_ois_history, adherence_barriers, adherence_barriers_detail,
                    dietary_requirements, religion, additional_info, captured_by, captured_at,
                    deleted_at, deleted_by)
                SELECT gen_random_uuid(), registration_id, viral_load, vl_test_date, tb_status,
                    hepatitis_b, false, (adherence_barriers IS NOT NULL), adherence_barriers,
                    left(dietary_requirements, 200), religion, additional_info, assessed_by, assessed_at,
                    deleted_at, deleted_by
                FROM camper_assessments;
                """);

            migrationBuilder.Sql("""
                INSERT INTO arrival_checks (
                    arrival_check_id, registration_id, has_allergies, allergies_detail,
                    eyesight, hearing, mobility_aids, prosthesis, adl_needs, tb_screening,
                    has_medication, medication_handed_in, medication_list, physical_condition,
                    status, assessed_by, assessed_at, signed_at, signed_by, deleted_at, deleted_by)
                SELECT gen_random_uuid(), registration_id, (allergies IS NOT NULL), allergies,
                    eyesight, hearing, mobility_aids, prosthesis, adl_needs::jsonb, symptom_flags::jsonb,
                    (current_medications IS NOT NULL), medication_handed_in,
                    CASE WHEN current_medications IS NOT NULL THEN jsonb_build_array(current_medications) END,
                    physical_condition,
                    'signed', assessed_by, assessed_at, assessed_at, assessed_by, deleted_at, deleted_by
                FROM camper_assessments;
                """);

            migrationBuilder.DropTable(
                name: "camper_assessments");

            migrationBuilder.Sql(ReadSqlFile("005_assessment_split_security.sql"));
            migrationBuilder.Sql(ReadSqlFile("006_role_based_rls.sql"));
        }

        private static string ReadSqlFile(string fileName)
        {
            var path = Path.Combine(AppContext.BaseDirectory, "Data", "Sql", fileName);
            return File.ReadAllText(path);
        }

        /// <inheritdoc />
        /// <remarks>
        /// Down restores the schema and the 002-era policies but NOT the data: rows
        /// created in the split tables after this migration ran are lost, and the
        /// original camper_assessments rows are not reconstructed. Acceptable for a
        /// development database; do not run Down against real data.
        /// </remarks>
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Unwind 006: role-aware policies come off every table so 002 can be
            // re-applied cleanly afterwards.
            migrationBuilder.Sql("""
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
                DROP FUNCTION IF EXISTS app_user_role();
                """);

            migrationBuilder.DropTable(
                name: "arrival_checks");

            migrationBuilder.DropTable(
                name: "precamp_medicals");

            migrationBuilder.Sql("DROP FUNCTION IF EXISTS enforce_arrival_check_lock();");
            migrationBuilder.Sql("DROP FUNCTION IF EXISTS block_precamp_medical_delete();");

            migrationBuilder.CreateTable(
                name: "camper_assessments",
                columns: table => new
                {
                    assessment_id = table.Column<Guid>(type: "uuid", nullable: false),
                    assessed_by = table.Column<Guid>(type: "uuid", nullable: false),
                    deleted_by = table.Column<Guid>(type: "uuid", nullable: true),
                    registration_id = table.Column<Guid>(type: "uuid", nullable: false),
                    additional_info = table.Column<string>(type: "text", nullable: true),
                    adherence_barriers = table.Column<string>(type: "text", nullable: true),
                    adl_needs = table.Column<string>(type: "jsonb", nullable: true),
                    allergies = table.Column<string>(type: "text", nullable: true),
                    assessed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    current_medications = table.Column<string>(type: "text", nullable: true),
                    deleted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    dietary_requirements = table.Column<string>(type: "text", nullable: true),
                    eyesight = table.Column<string>(type: "text", nullable: true),
                    hearing = table.Column<string>(type: "text", nullable: true),
                    hepatitis_b = table.Column<bool>(type: "boolean", nullable: true),
                    medication_handed_in = table.Column<bool>(type: "boolean", nullable: false),
                    mobility_aids = table.Column<string>(type: "text", nullable: true),
                    physical_condition = table.Column<string>(type: "text", nullable: true),
                    prosthesis = table.Column<string>(type: "text", nullable: true),
                    religion = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    symptom_flags = table.Column<string>(type: "jsonb", nullable: true),
                    tb_status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    viral_load = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    vl_test_date = table.Column<DateOnly>(type: "date", nullable: true)
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

            // Restore the 002-era authentication-only policies and the old
            // immutability trigger on the recreated table.
            migrationBuilder.Sql(ReadSqlFile("002_rls_policies.sql"));
            migrationBuilder.Sql("""
                ALTER TABLE camper_assessments ENABLE ROW LEVEL SECURITY;
                CREATE TRIGGER trg_camper_assessments_immutability
                    BEFORE UPDATE OR DELETE ON camper_assessments
                    FOR EACH ROW EXECUTE FUNCTION enforce_clinical_immutability();
                """);
        }
    }
}
