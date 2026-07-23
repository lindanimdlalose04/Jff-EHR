using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JffEhr.Api.Migrations
{
    /// <summary>
    /// No EF model changes. Wires in the RLS policies and immutability triggers as
    /// plain SQL, kept in Data/Sql so they're reviewable directly rather than buried
    /// as C# strings. See Data/Sql/*.sql for the actual policy/trigger definitions.
    /// </summary>
    public partial class AddSecurityLayer : Migration
    {
        private static readonly string[] UpScripts =
        [
            "001_enable_rls.sql",
            "002_rls_policies.sql",
            "003_clinical_immutability_triggers.sql",
            "004_audit_log_immutability_trigger.sql",
        ];

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            foreach (var script in UpScripts)
            {
                migrationBuilder.Sql(ReadSqlFile(script));
            }
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Reverse order: triggers/functions, then policies, then RLS itself.
            migrationBuilder.Sql("DROP TRIGGER IF EXISTS trg_audit_logs_append_only ON audit_logs;");
            migrationBuilder.Sql("DROP FUNCTION IF EXISTS block_audit_log_mutation();");

            migrationBuilder.Sql("DROP TRIGGER IF EXISTS trg_camper_assessments_immutability ON camper_assessments;");
            migrationBuilder.Sql("DROP TRIGGER IF EXISTS trg_consent_records_immutability ON consent_records;");
            migrationBuilder.Sql("DROP TRIGGER IF EXISTS trg_prescriptions_immutability ON prescriptions;");
            migrationBuilder.Sql("DROP TRIGGER IF EXISTS trg_medication_doses_immutability ON medication_doses;");
            migrationBuilder.Sql("DROP TRIGGER IF EXISTS trg_medshack_visits_immutability ON medshack_visits;");
            migrationBuilder.Sql("DROP TRIGGER IF EXISTS trg_medshack_treatments_immutability ON medshack_treatments;");
            migrationBuilder.Sql("DROP TRIGGER IF EXISTS trg_medication_events_immutability ON medication_events;");
            migrationBuilder.Sql("DROP FUNCTION IF EXISTS enforce_clinical_immutability();");

            string[] policyTables =
            [
                "campers", "caregivers", "emergency_contacts", "crew_members", "users",
                "camps", "camp_registrations", "crew_medical_checkins",
                "camper_assessments", "consent_records", "prescriptions",
                "medication_doses", "medshack_visits", "medshack_treatments",
                "medication_events", "audit_logs",
            ];
            foreach (var table in policyTables)
            {
                migrationBuilder.Sql($"DROP POLICY IF EXISTS {table}_select ON {table};");
                migrationBuilder.Sql($"DROP POLICY IF EXISTS {table}_insert ON {table};");
                migrationBuilder.Sql($"DROP POLICY IF EXISTS {table}_update ON {table};");
                migrationBuilder.Sql($"DROP POLICY IF EXISTS {table}_delete ON {table};");
                migrationBuilder.Sql($"DROP POLICY IF EXISTS {table}_delete_none ON {table};");
                migrationBuilder.Sql($"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY;");
            }
            migrationBuilder.Sql("DROP POLICY IF EXISTS audit_logs_select_admin ON audit_logs;");
            migrationBuilder.Sql("DROP POLICY IF EXISTS audit_logs_update_none ON audit_logs;");
            migrationBuilder.Sql("DROP POLICY IF EXISTS audit_logs_delete_none ON audit_logs;");

            migrationBuilder.Sql("DROP FUNCTION IF EXISTS app_current_user_id();");
        }

        private static string ReadSqlFile(string fileName)
        {
            var path = Path.Combine(AppContext.BaseDirectory, "Data", "Sql", fileName);
            return File.ReadAllText(path);
        }
    }
}
