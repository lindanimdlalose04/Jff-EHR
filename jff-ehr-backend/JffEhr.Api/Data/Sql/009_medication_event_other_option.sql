START TRANSACTION;

ALTER TABLE medication_events ADD other_contributing_factor text;

ALTER TABLE medication_events ADD other_event_type text;

INSERT INTO "__EFMigrationsHistory" (migration_id, product_version)
VALUES ('20260807064928_MedicationEventOtherOption', '8.0.11');

COMMIT;

