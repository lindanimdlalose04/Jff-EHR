using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JffEhr.Api.Migrations
{
    /// <inheritdoc />
    public partial class MedicationEventOtherOption : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "other_contributing_factor",
                table: "medication_events",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "other_event_type",
                table: "medication_events",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "other_contributing_factor",
                table: "medication_events");

            migrationBuilder.DropColumn(
                name: "other_event_type",
                table: "medication_events");
        }
    }
}
