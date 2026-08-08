START TRANSACTION;

ALTER TABLE crew_medical_checkins DROP COLUMN has_blood_count;

ALTER TABLE crew_medical_checkins DROP COLUMN has_broviac_port;

ALTER TABLE crew_medical_checkins RENAME COLUMN mobility_aids TO comments;

INSERT INTO "__EFMigrationsHistory" (migration_id, product_version)
VALUES ('20260807080033_SimplifyCrewCheckin', '8.0.11');

COMMIT;

