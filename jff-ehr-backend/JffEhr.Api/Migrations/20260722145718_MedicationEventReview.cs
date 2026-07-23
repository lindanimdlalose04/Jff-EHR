using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JffEhr.Api.Migrations
{
    /// <summary>
    /// Adds the form's explicit "no treatment ordered" flag and the review
    /// timestamp, then replaces the blanket immutability trigger on
    /// medication_events with the append-and-review-only rule, so a medical
    /// person can sign an event off exactly once without ever editing what was
    /// filed. See Data/Sql/008_medication_event_review.sql.
    /// </summary>
    public partial class MedicationEventReview : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "no_treatment_ordered",
                table: "medication_events",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "reviewed_at",
                table: "medication_events",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.Sql(ReadSqlFile("008_medication_event_review.sql"));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Restore the blanket write-once behaviour from 003.
            migrationBuilder.Sql("DROP TRIGGER IF EXISTS trg_medication_events_review ON medication_events;");
            migrationBuilder.Sql("DROP FUNCTION IF EXISTS enforce_medication_event_review();");
            migrationBuilder.Sql("""
                CREATE TRIGGER trg_medication_events_immutability
                    BEFORE UPDATE OR DELETE ON medication_events
                    FOR EACH ROW EXECUTE FUNCTION enforce_clinical_immutability();
                """);

            migrationBuilder.DropColumn(
                name: "no_treatment_ordered",
                table: "medication_events");

            migrationBuilder.DropColumn(
                name: "reviewed_at",
                table: "medication_events");
        }

        private static string ReadSqlFile(string fileName)
        {
            var path = Path.Combine(AppContext.BaseDirectory, "Data", "Sql", fileName);
            return File.ReadAllText(path);
        }
    }
}
