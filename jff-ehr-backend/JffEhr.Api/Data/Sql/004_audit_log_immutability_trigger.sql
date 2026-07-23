-- audit_logs is append-only at the DB level: INSERT allowed, UPDATE and DELETE
-- blocked unconditionally. Unlike the clinical tables, there's no flag-column
-- exception here -- audit_logs has no soft-delete columns, nothing about an audit
-- entry is ever meant to change once written.
CREATE OR REPLACE FUNCTION block_audit_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'audit_logs is append-only; % is not permitted.', TG_OP;
END;
$$;

CREATE TRIGGER trg_audit_logs_append_only
    BEFORE UPDATE OR DELETE ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION block_audit_log_mutation();
