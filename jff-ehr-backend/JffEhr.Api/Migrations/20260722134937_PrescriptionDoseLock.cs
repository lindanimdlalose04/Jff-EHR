using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JffEhr.Api.Migrations
{
    /// <summary>
    /// No EF model changes. Replaces the blanket clinical-immutability trigger on
    /// prescriptions with a conditional lock, so the table matches the brief's
    /// two-tier rule: full CRUD until the first dose is administered, locked after.
    /// See Data/Sql/007_prescription_dose_lock.sql.
    /// </summary>
    public partial class PrescriptionDoseLock : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(ReadSqlFile("007_prescription_dose_lock.sql"));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Restore the blanket write-once behaviour from 003.
            migrationBuilder.Sql("DROP TRIGGER IF EXISTS trg_prescriptions_lock ON prescriptions;");
            migrationBuilder.Sql("DROP FUNCTION IF EXISTS enforce_prescription_lock();");
            migrationBuilder.Sql("""
                CREATE TRIGGER trg_prescriptions_immutability
                    BEFORE UPDATE OR DELETE ON prescriptions
                    FOR EACH ROW EXECUTE FUNCTION enforce_clinical_immutability();
                """);
        }

        private static string ReadSqlFile(string fileName)
        {
            var path = Path.Combine(AppContext.BaseDirectory, "Data", "Sql", fileName);
            return File.ReadAllText(path);
        }
    }
}
