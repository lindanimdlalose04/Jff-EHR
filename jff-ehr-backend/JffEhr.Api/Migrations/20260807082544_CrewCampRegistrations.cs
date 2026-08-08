using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JffEhr.Api.Migrations
{
    /// <inheritdoc />
    public partial class CrewCampRegistrations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "crew_camp_registrations",
                columns: table => new
                {
                    crew_registration_id = table.Column<Guid>(type: "uuid", nullable: false),
                    crew_id = table.Column<Guid>(type: "uuid", nullable: false),
                    camp_id = table.Column<Guid>(type: "uuid", nullable: false),
                    role = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: true),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    registered_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_crew_camp_registrations", x => x.crew_registration_id);
                    table.ForeignKey(
                        name: "fk_crew_camp_registrations_camps_camp_id",
                        column: x => x.camp_id,
                        principalTable: "camps",
                        principalColumn: "camp_id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_crew_camp_registrations_crew_members_crew_id",
                        column: x => x.crew_id,
                        principalTable: "crew_members",
                        principalColumn: "crew_id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_crew_camp_registrations_camp_id",
                table: "crew_camp_registrations",
                column: "camp_id");

            migrationBuilder.CreateIndex(
                name: "ix_crew_camp_registrations_crew_id_camp_id",
                table: "crew_camp_registrations",
                columns: new[] { "crew_id", "camp_id" },
                unique: true);

            // Tier 1 security, mirroring camp_registrations (005 grant pattern +
            // 006 role-based policies): the app role may use the table, anyone
            // authenticated may read, and only medical/admin may write.
            migrationBuilder.Sql(@"
                GRANT SELECT, INSERT, UPDATE, DELETE ON crew_camp_registrations TO jff_api;

                ALTER TABLE crew_camp_registrations ENABLE ROW LEVEL SECURITY;

                CREATE POLICY crew_camp_registrations_select ON crew_camp_registrations
                    FOR SELECT USING (app_current_user_id() IS NOT NULL);
                CREATE POLICY crew_camp_registrations_insert ON crew_camp_registrations
                    FOR INSERT WITH CHECK (app_user_role() IN ('medical', 'admin'));
                CREATE POLICY crew_camp_registrations_update ON crew_camp_registrations
                    FOR UPDATE USING (app_user_role() IN ('medical', 'admin'))
                    WITH CHECK (app_user_role() IN ('medical', 'admin'));
                CREATE POLICY crew_camp_registrations_delete ON crew_camp_registrations
                    FOR DELETE USING (app_user_role() IN ('medical', 'admin'));
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "crew_camp_registrations");
        }
    }
}
