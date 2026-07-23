-- medication_events is append-and-review-only: the reporter files it, a
-- medical person later signs it off, and nobody ever edits what was filed.
--
-- The blanket clinical-immutability trigger allowed no update at all, which
-- made that review step impossible. This replaces it with a rule that permits
-- exactly one narrow change:
--
--   - DELETE is still never permitted (soft delete only).
--   - A change to only deleted_at/deleted_by is always allowed.
--   - Otherwise the only columns that may change are reviewer_id,
--     corrective_action and reviewed_at, every other column must be identical,
--     and the event must not already carry a review. A review is therefore
--     added once and can never be rewritten or withdrawn.
DROP TRIGGER IF EXISTS trg_medication_events_immutability ON medication_events;

CREATE OR REPLACE FUNCTION enforce_medication_event_review()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Hard delete is not permitted on medication_events; use the soft-delete flag columns.';
    END IF;

    IF (to_jsonb(OLD) - 'deleted_at' - 'deleted_by')
        IS NOT DISTINCT FROM
       (to_jsonb(NEW) - 'deleted_at' - 'deleted_by') THEN
        RETURN NEW;
    END IF;

    IF (to_jsonb(OLD) - 'deleted_at' - 'deleted_by' - 'reviewer_id' - 'corrective_action' - 'reviewed_at')
        IS DISTINCT FROM
       (to_jsonb(NEW) - 'deleted_at' - 'deleted_by' - 'reviewer_id' - 'corrective_action' - 'reviewed_at') THEN
        RAISE EXCEPTION 'A filed event cannot be edited; only the medical review may be added.';
    END IF;

    IF OLD.reviewer_id IS NOT NULL OR OLD.corrective_action IS NOT NULL THEN
        RAISE EXCEPTION 'This event has already been reviewed; the review cannot be changed.';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_medication_events_review
    BEFORE UPDATE OR DELETE ON medication_events
    FOR EACH ROW EXECUTE FUNCTION enforce_medication_event_review();
