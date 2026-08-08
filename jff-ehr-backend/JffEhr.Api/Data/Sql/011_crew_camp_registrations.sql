START TRANSACTION;

CREATE TABLE crew_camp_registrations (
    crew_registration_id uuid NOT NULL,
    crew_id uuid NOT NULL,
    camp_id uuid NOT NULL,
    role character varying(60),
    status character varying(20) NOT NULL,
    registered_at timestamp with time zone NOT NULL,
    CONSTRAINT pk_crew_camp_registrations PRIMARY KEY (crew_registration_id),
    CONSTRAINT fk_crew_camp_registrations_camps_camp_id FOREIGN KEY (camp_id) REFERENCES camps (camp_id) ON DELETE CASCADE,
    CONSTRAINT fk_crew_camp_registrations_crew_members_crew_id FOREIGN KEY (crew_id) REFERENCES crew_members (crew_id) ON DELETE RESTRICT
);

CREATE INDEX ix_crew_camp_registrations_camp_id ON crew_camp_registrations (camp_id);

CREATE UNIQUE INDEX ix_crew_camp_registrations_crew_id_camp_id ON crew_camp_registrations (crew_id, camp_id);


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
            

INSERT INTO "__EFMigrationsHistory" (migration_id, product_version)
VALUES ('20260807082544_CrewCampRegistrations', '8.0.11');

COMMIT;

