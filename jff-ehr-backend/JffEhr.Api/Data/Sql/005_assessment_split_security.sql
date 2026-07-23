-- Security wiring for the Refinement A split tables (precamp_medicals and
-- arrival_checks). RLS policies for both live in 006_role_based_rls.sql so the
-- whole role matrix reads as one document; this file carries RLS enablement,
-- grants, and the immutability triggers.

ALTER TABLE precamp_medicals ENABLE ROW LEVEL SECURITY;
ALTER TABLE arrival_checks ENABLE ROW LEVEL SECURITY;

-- The runtime role needs table privileges on the new tables (RLS then narrows
-- what those privileges can actually reach).
GRANT SELECT, INSERT, UPDATE, DELETE ON precamp_medicals TO jff_api;
GRANT SELECT, INSERT, UPDATE, DELETE ON arrival_checks TO jff_api;

-- precamp_medicals: no signing lifecycle (per the brief it stays editable), but
-- it is still a clinical record: hard DELETE is never permitted, corrections are
-- edits while live or a soft delete.
CREATE OR REPLACE FUNCTION block_precamp_medical_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Hard delete is not permitted on precamp_medicals; use the soft-delete flag columns.';
END;
$$;

CREATE TRIGGER trg_precamp_medicals_no_delete
    BEFORE DELETE ON precamp_medicals
    FOR EACH ROW EXECUTE FUNCTION block_precamp_medical_delete();

-- arrival_checks: the draft -> signed lock (Refinement B).
--   - DELETE is unconditionally rejected.
--   - While status = 'draft', any UPDATE is allowed (Gail pre-loads and edits
--     freely before day one).
--   - Once status = 'signed', only deleted_at/deleted_by may change: corrections
--     after the lock are visible amendments (soft delete plus a new row), never
--     silent edits. This also blocks un-signing (status is not an exempt column).
CREATE OR REPLACE FUNCTION enforce_arrival_check_lock()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Hard delete is not permitted on arrival_checks; use the soft-delete flag columns.';
    END IF;

    IF OLD.status = 'signed' AND
       (to_jsonb(OLD) - 'deleted_at' - 'deleted_by')
           IS DISTINCT FROM
       (to_jsonb(NEW) - 'deleted_at' - 'deleted_by') THEN
        RAISE EXCEPTION 'This arrival check is signed and locked; only deleted_at/deleted_by may change. Record corrections as a new amendment.';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_arrival_checks_lock
    BEFORE UPDATE OR DELETE ON arrival_checks
    FOR EACH ROW EXECUTE FUNCTION enforce_arrival_check_lock();
