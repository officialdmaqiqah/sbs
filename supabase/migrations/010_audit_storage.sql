-- 010_audit_storage.sql
-- Description: Audit Logs and Attachments (Storage)

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    entity_type VARCHAR(100) NOT NULL, -- e.g., 'INVENTORY_MOVEMENT', 'JOURNAL_ENTRY'
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL, -- CREATE, UPDATE, DELETE, POST, REVERSE
    old_value JSONB,
    new_value JSONB,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    ip_address VARCHAR(50),
    user_agent TEXT
);

-- Index for querying audit history of an entity
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_org ON audit_logs(organization_id);

CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    entity_type VARCHAR(100) NOT NULL, -- e.g., 'PURCHASE_RECEIPT'
    entity_id UUID NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    storage_path TEXT NOT NULL,
    mime_type VARCHAR(100),
    size INT,
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_attachments_entity ON attachments(entity_type, entity_id);

-- Generic Audit Trigger Function
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
    v_entity_id UUID;
    v_org_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_entity_id := OLD.id;
        v_org_id := OLD.organization_id;
    ELSE
        v_entity_id := NEW.id;
        v_org_id := NEW.organization_id;
    END IF;

    INSERT INTO audit_logs (
        organization_id,
        entity_type,
        entity_id,
        action,
        created_by,
        old_value,
        new_value
    ) VALUES (
        v_org_id,
        UPPER(TG_TABLE_NAME),
        v_entity_id,
        TG_OP,
        auth.uid(),
        CASE WHEN TG_OP IN ('DELETE', 'UPDATE') THEN row_to_json(OLD)::jsonb ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW)::jsonb ELSE NULL END
    );
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply Audit Trigger to Attachments
CREATE TRIGGER audit_attachments_trigger
AFTER INSERT OR UPDATE OR DELETE ON attachments
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Apply Audit Trigger to Journal Entries
CREATE TRIGGER audit_journal_entries_trigger
AFTER INSERT OR UPDATE OR DELETE ON journal_entries
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Note: Storage buckets themselves are created using Supabase storage APIs or migration wrappers.
-- We can insert into storage.buckets here if we have permissions, but typically we do it via SQL.
-- Supabase Storage Schema:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('sbs-documents', 'sbs-documents', false) ON CONFLICT DO NOTHING;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'storage' AND tablename = 'buckets') THEN
        -- If storage schema doesn't exist (e.g. running in standard postgres), skip
        RAISE NOTICE 'Storage schema not found. Skipping bucket creation.';
    ELSE
        -- Create private bucket
        EXECUTE 'INSERT INTO storage.buckets (id, name, public) VALUES (''sbs-documents'', ''sbs-documents'', false) ON CONFLICT DO NOTHING;';
    END IF;
END $$;
