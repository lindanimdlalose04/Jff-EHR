using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JffEhr.Api.Migrations
{
    /// <inheritdoc />
    public partial class SimplifyCrewCheckin : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "has_blood_count",
                table: "crew_medical_checkins");

            migrationBuilder.DropColumn(
                name: "has_broviac_port",
                table: "crew_medical_checkins");

            migrationBuilder.RenameColumn(
                name: "mobility_aids",
                table: "crew_medical_checkins",
                newName: "comments");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "comments",
                table: "crew_medical_checkins",
                newName: "mobility_aids");

            migrationBuilder.AddColumn<bool>(
                name: "has_blood_count",
                table: "crew_medical_checkins",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "has_broviac_port",
                table: "crew_medical_checkins",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }
    }
}
