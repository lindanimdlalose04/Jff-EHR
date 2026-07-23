-- DB-level immutability for the 7 clinical tables. This is the hard requirement:
-- a direct SQL connection or a compromised API must not be able to alter or hard-
-- delete a signed clinical record, no matter what RLS or app-layer RBAC say.
--
-- One generic trigger function, reused identically across all 7 tables:
--   - DELETE is unconditionally rejected.
--   - UPDATE is rejected unless the only columns that changed are deleted_at and
--     deleted_by (the soft-delete flags). Every other column, on every one of these
--     tables, is write-once.
CREATE OR REPLACE FUNCTION enforce_clinical_immutability()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Hard delete is not permitted on %; use the soft-delete flag columns.', TG_TABLE_NAME;
    END IF;

    IF (to_jsonb(OLD) - 'deleted_at' - 'deleted_by')
        IS DISTINCT FROM
       (to_jsonb(NEW) - 'deleted_at' - 'deleted_by') THEN
        RAISE EXCEPTION 'Only deleted_at/deleted_by may be updated on %; all other columns are immutable.', TG_TABLE_NAME;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_camper_assessments_immutability
    BEFORE UPDATE OR DELETE ON camper_assessments
    FOR EACH ROW EXECUTE FUNCTION enforce_clinical_immutability();

CREATE TRIGGER trg_consent_records_immutability
    BEFORE UPDATE OR DELETE ON consent_records
    FOR EACH ROW EXECUTE FUNCTION enforce_clinical_immutability();

CREATE TRIGGER trg_prescriptions_immutability
    BEFORE UPDATE OR DELETE ON prescriptions
    FOR EACH ROW EXECUTE FUNCTION enforce_clinical_immutability();

CREATE TRIGGER trg_medication_doses_immutability
    BEFORE UPDATE OR DELETE ON medication_doses
    FOR EACH ROW EXECUTE FUNCTION enforce_clinical_immutability();

CREATE TRIGGER trg_medshack_visits_immutability
    BEFORE UPDATE OR DELETE ON medshack_visits
    FOR EACH ROW EXECUTE FUNCTION enforce_clinical_immutability();

CREATE TRIGGER trg_medshack_treatments_immutability
    BEFORE UPDATE OR DELETE ON medshack_treatments
    FOR EACH ROW EXECUTE FUNCTION enforce_clinical_immutability();

CREATE TRIGGER trg_medication_events_immutability
    BEFORE UPDATE OR DELETE ON medication_events
    FOR EACH ROW EXECUTE FUNCTION enforce_clinical_immutability();
