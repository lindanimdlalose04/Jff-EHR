-- Prescriptions are the one hybrid in the brief's two-tier maintain model:
-- Tier 1 (full CRUD) while no dose has been administered, Tier 2 (locked,
-- correct by amendment) from the first administered dose onward.
--
-- The original blanket clinical-immutability trigger made prescriptions
-- write-once from creation, which contradicts that rule: a nurse could never
-- fix a dose typed wrongly at prescribing time, even before anyone acted on
-- it. This replaces it with a conditional lock.
--
--   - DELETE is still never permitted (withdrawal is a soft delete).
--   - A change to only deleted_at/deleted_by is always allowed, so a
--     prescription can be withdrawn in either state.
--   - Any other column change requires that no live dose has been
--     administered against this prescription. Scheduled-but-not-given rows do
--     not lock it, matching "before the first dose is administered".
DROP TRIGGER IF EXISTS trg_prescriptions_immutability ON prescriptions;

CREATE OR REPLACE FUNCTION enforce_prescription_lock()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Hard delete is not permitted on prescriptions; use the soft-delete flag columns.';
    END IF;

    IF (to_jsonb(OLD) - 'deleted_at' - 'deleted_by')
        IS NOT DISTINCT FROM
       (to_jsonb(NEW) - 'deleted_at' - 'deleted_by') THEN
        RETURN NEW;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM medication_doses d
        WHERE d.prescription_id = OLD.prescription_id
          AND d.deleted_at IS NULL
          AND d.administered_at IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'This prescription is locked: a dose has already been administered. Withdraw it and prescribe a correction instead.';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prescriptions_lock
    BEFORE UPDATE OR DELETE ON prescriptions
    FOR EACH ROW EXECUTE FUNCTION enforce_prescription_lock();
