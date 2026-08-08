START TRANSACTION;

ALTER TABLE crew_medical_checkins DROP CONSTRAINT fk_crew_medical_checkins_camps_camp_id;

ALTER TABLE crew_medical_checkins DROP CONSTRAINT fk_crew_medical_checkins_crew_members_crew_id;

DROP INDEX ix_crew_medical_checkins_camp_id;

DROP INDEX ix_crew_medical_checkins_crew_id;

ALTER TABLE crew_medical_checkins ADD crew_registration_id uuid;


                INSERT INTO crew_camp_registrations (crew_registration_id, crew_id, camp_id, role, status, registered_at)
                SELECT gen_random_uuid(), c.crew_id, c.camp_id, NULL, 'attended', now()
                FROM (SELECT DISTINCT crew_id, camp_id FROM crew_medical_checkins) c
                WHERE NOT EXISTS (
                    SELECT 1 FROM crew_camp_registrations r
                    WHERE r.crew_id = c.crew_id AND r.camp_id = c.camp_id
                );


                UPDATE crew_medical_checkins ch
                SET crew_registration_id = r.crew_registration_id
                FROM crew_camp_registrations r
                WHERE r.crew_id = ch.crew_id AND r.camp_id = ch.camp_id;

ALTER TABLE crew_medical_checkins ALTER COLUMN crew_registration_id SET NOT NULL;

ALTER TABLE crew_medical_checkins DROP COLUMN camp_id;

ALTER TABLE crew_medical_checkins DROP COLUMN crew_id;

CREATE INDEX ix_crew_medical_checkins_crew_registration_id ON crew_medical_checkins (crew_registration_id);

ALTER TABLE crew_medical_checkins ADD CONSTRAINT fk_crew_medical_checkins_crew_camp_registrations_crew_registra FOREIGN KEY (crew_registration_id) REFERENCES crew_camp_registrations (crew_registration_id) ON DELETE CASCADE;

INSERT INTO "__EFMigrationsHistory" (migration_id, product_version)
VALUES ('20260807114240_CrewCheckinToRegistration', '8.0.11');

COMMIT;

