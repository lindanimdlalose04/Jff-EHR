using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JffEhr.Api.Migrations
{
    /// <inheritdoc />
    public partial class PartialUniqueClinicalRegistrationIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_precamp_medicals_registration_id",
                table: "precamp_medicals");

            migrationBuilder.DropIndex(
                name: "ix_arrival_checks_registration_id",
                table: "arrival_checks");

            migrationBuilder.CreateIndex(
                name: "ix_precamp_medicals_registration_id",
                table: "precamp_medicals",
                column: "registration_id",
                unique: true,
                filter: "deleted_at IS NULL");

            migrationBuilder.CreateIndex(
                name: "ix_arrival_checks_registration_id",
                table: "arrival_checks",
                column: "registration_id",
                unique: true,
                filter: "deleted_at IS NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_precamp_medicals_registration_id",
                table: "precamp_medicals");

            migrationBuilder.DropIndex(
                name: "ix_arrival_checks_registration_id",
                table: "arrival_checks");

            migrationBuilder.CreateIndex(
                name: "ix_precamp_medicals_registration_id",
                table: "precamp_medicals",
                column: "registration_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_arrival_checks_registration_id",
                table: "arrival_checks",
                column: "registration_id",
                unique: true);
        }
    }
}
