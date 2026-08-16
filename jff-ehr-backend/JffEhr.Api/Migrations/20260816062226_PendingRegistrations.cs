using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JffEhr.Api.Migrations
{
    /// <inheritdoc />
    public partial class PendingRegistrations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "pending_registrations",
                columns: table => new
                {
                    pending_registration_id = table.Column<Guid>(type: "uuid", nullable: false),
                    import_batch_id = table.Column<Guid>(type: "uuid", nullable: false),
                    source_row = table.Column<int>(type: "integer", nullable: false),
                    first_name = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    surname = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    dob = table.Column<DateOnly>(type: "date", nullable: true),
                    sex = table.Column<string>(type: "character varying(8)", maxLength: 8, nullable: true),
                    race = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    address = table.Column<string>(type: "text", nullable: true),
                    cell_number = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    language = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    t_shirt_size = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    caregiver_name = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: true),
                    caregiver_cell_no = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    caregiver_work_no = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    emergency_name = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: true),
                    emergency_cell_no = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    emergency_work_no = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    emergency_relationship = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    raw_dob = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    import_note = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    possible_duplicate = table.Column<bool>(type: "boolean", nullable: false),
                    duplicate_of_camper_id = table.Column<Guid>(type: "uuid", nullable: true),
                    promoted_camper_id = table.Column<Guid>(type: "uuid", nullable: true),
                    imported_by = table.Column<Guid>(type: "uuid", nullable: false),
                    imported_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    reviewed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_pending_registrations", x => x.pending_registration_id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_pending_registrations_import_batch_id",
                table: "pending_registrations",
                column: "import_batch_id");

            migrationBuilder.CreateIndex(
                name: "ix_pending_registrations_status",
                table: "pending_registrations",
                column: "status");

            // Admin-only staging table. Unlike the Tier 1 clinical tables (which any
            // authenticated user may read), unconfirmed intake data is visible and
            // writable only to the admin role, so every policy checks app_user_role() =
            // 'admin'. The app role may use the table; RLS narrows to admin.
            migrationBuilder.Sql(@"
                GRANT SELECT, INSERT, UPDATE, DELETE ON pending_registrations TO jff_api;

                ALTER TABLE pending_registrations ENABLE ROW LEVEL SECURITY;

                CREATE POLICY pending_registrations_select ON pending_registrations
                    FOR SELECT USING (app_user_role() = 'admin');
                CREATE POLICY pending_registrations_insert ON pending_registrations
                    FOR INSERT WITH CHECK (app_user_role() = 'admin');
                CREATE POLICY pending_registrations_update ON pending_registrations
                    FOR UPDATE USING (app_user_role() = 'admin')
                    WITH CHECK (app_user_role() = 'admin');
                CREATE POLICY pending_registrations_delete ON pending_registrations
                    FOR DELETE USING (app_user_role() = 'admin');
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "pending_registrations");
        }
    }
}
