-- 014_storage_policies.sql

-- RLS is already enabled by default on storage.objects in Supabase.
-- We only need to create the policies.

-- Policy 1: CEO_ADMIN has full access to all objects in sbs-documents
CREATE POLICY "CEO_ADMIN Full Access to Documents" ON storage.objects
    FOR ALL
    USING (
        bucket_id = 'sbs-documents' AND 
        current_user_has_role('CEO_ADMIN')
    );

-- Actually, let's make it simpler and more robust based on user roles and organization since storage.objects doesn't have organization_id natively unless we embed it in the path or metadata.
-- We will assume folder structure: organization_id/entity_type/entity_id/filename
-- Example path: "uuid-of-org/invoices/uuid-of-invoice/receipt.pdf"

-- Drop existing generic policies if any (safeguard)
DROP POLICY IF EXISTS "CEO_ADMIN Full Access to Documents" ON storage.objects;

-- Policy: Users can only access objects in their organization's folder
-- Path array: [organization_id, entity_type, entity_id, filename]
CREATE POLICY "Users can access their org documents" ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'sbs-documents' AND
        (storage.foldername(name))[1] = current_user_organization_id()::text
    );

-- Policy: Only users with write access to specific entities can upload/delete
-- For MVP, we allow any active org user to upload to their org folder, 
-- but rely on application logic (via RPC or Service) to enforce strict entity ownership before generating upload tokens/signed URLs.
CREATE POLICY "Users can upload to their org folder" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'sbs-documents' AND
        (storage.foldername(name))[1] = current_user_organization_id()::text
    );

CREATE POLICY "Users can delete from their org folder" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'sbs-documents' AND
        (storage.foldername(name))[1] = current_user_organization_id()::text
    );

-- Ensure public access is completely denied
-- (No policy for anon/public)
