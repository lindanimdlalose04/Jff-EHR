using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JffEhr.Api.Migrations
{
    /// <inheritdoc />
    public partial class CrewCheckinToRegistration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Full mirror of the camper clinical chain: the crew medical check-in
            // now hangs off crew_camp_registrations instead of carrying its own
            // crew_id + camp_id. Drop the direct FKs and indexes first.
            migrationBuilder.DropForeignKey(
                name: "fk_crew_medical_checkins_camps_camp_id",
                table: "crew_medical_checkins");

            migrationBuilder.DropForeignKey(
                name: "fk_crew_medical_checkins_crew_members_crew_id",
                table: "crew_medical_checkins");

            migrationBuilder.DropIndex(
                name: "ix_crew_medical_checkins_camp_id",
                table: "crew_medical_checkins");

            migrationBuilder.DropIndex(
                name: "ix_crew_medical_checkins_crew_id",
                table: "crew_medical_checkins");

            // Add the link column as nullable so existing rows can be backfilled.
            migrationBuilder.AddColumn<Guid>(
                name: "crew_registration_id",
                table: "crew_medical_checkins",
                type: "uuid",
                nullable: true);

            // Every existing check-in implies attendance: create a registration for
            // each (crew, camp) that has a check-in but no registration yet, then
            // link each check-in to its registration.
            migrationBuilder.Sql(@"
                INSERT INTO crew_camp_registrations (crew_registration_id, crew_id, camp_id, role, status, registered_at)
                SELECT gen_random_uuid(), c.crew_id, c.camp_id, NULL, 'attended', now()
                FROM (SELECT DISTINCT crew_id, camp_id FROM crew_medical_checkins) c
                WHERE NOT EXISTS (
                    SELECT 1 FROM crew_camp_registrations r
                    WHERE r.crew_id = c.crew_id AND r.camp_id = c.camp_id
                );");

            migrationBuilder.Sql(@"
                UPDATE crew_medical_checkins ch
                SET crew_registration_id = r.crew_registration_id
                FROM crew_camp_registrations r
                WHERE r.crew_id = ch.crew_id AND r.camp_id = ch.camp_id;");

            // Now that every row is linked, enforce NOT NULL and drop the old columns.
            migrationBuilder.AlterColumn<Guid>(
                name: "crew_registration_id",
                table: "crew_medical_checkins",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.DropColumn(
                name: "camp_id",
                table: "crew_medical_checkins");

            migrationBuilder.DropColumn(
                name: "crew_id",
                table: "crew_medical_checkins");

            migrationBuilder.CreateIndex(
                name: "ix_crew_medical_checkins_crew_registration_id",
                table: "crew_medical_checkins",
                column: "crew_registration_id");

            migrationBuilder.AddForeignKey(
                name: "fk_crew_medical_checkins_crew_camp_registrations_crew_registra",
                table: "crew_medical_checkins",
                column: "crew_registration_id",
                principalTable: "crew_camp_registrations",
                principalColumn: "crew_registration_id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_crew_medical_checkins_crew_camp_registrations_crew_registra",
                table: "crew_medical_checkins");

            migrationBuilder.DropIndex(
                name: "ix_crew_medical_checkins_crew_registration_id",
                table: "crew_medical_checkins");

            migrationBuilder.AddColumn<Guid>(
                name: "crew_id",
                table: "crew_medical_checkins",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "camp_id",
                table: "crew_medical_checkins",
                type: "uuid",
                nullable: true);

            // Restore crew_id and camp_id from the registration each check-in points to.
            migrationBuilder.Sql(@"
                UPDATE crew_medical_checkins ch
                SET crew_id = r.crew_id, camp_id = r.camp_id
                FROM crew_camp_registrations r
                WHERE r.crew_registration_id = ch.crew_registration_id;");

            migrationBuilder.AlterColumn<Guid>(
                name: "crew_id",
                table: "crew_medical_checkins",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "camp_id",
                table: "crew_medical_checkins",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.DropColumn(
                name: "crew_registration_id",
                table: "crew_medical_checkins");

            migrationBuilder.CreateIndex(
                name: "ix_crew_medical_checkins_crew_id",
                table: "crew_medical_checkins",
                column: "crew_id");

            migrationBuilder.CreateIndex(
                name: "ix_crew_medical_checkins_camp_id",
                table: "crew_medical_checkins",
                column: "camp_id");

            migrationBuilder.AddForeignKey(
                name: "fk_crew_medical_checkins_camps_camp_id",
                table: "crew_medical_checkins",
                column: "camp_id",
                principalTable: "camps",
                principalColumn: "camp_id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_crew_medical_checkins_crew_members_crew_id",
                table: "crew_medical_checkins",
                column: "crew_id",
                principalTable: "crew_members",
                principalColumn: "crew_id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
