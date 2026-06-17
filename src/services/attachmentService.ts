import { supabase } from '../lib/supabase';
import { environment } from '../config/environment';

export interface Attachment {
  id: string;
  organization_id: string;
  entity_type: string;
  entity_id: string;
  file_name: string;
  mime_type?: string;
  size: number;
  storage_path: string;
  uploaded_by: string;
  created_at: string;
}

export const attachmentService = {
  /**
   * Uploads a file to Supabase Storage and records metadata in the attachments table.
   */
  async uploadAttachment(
    file: File, 
    entityType: string, 
    entityId: string, 
    organizationId: string
  ): Promise<Attachment> {
    if (environment.dataProvider === 'local') {
      console.warn('Local provider: mock upload attachment.');
      return {
        id: crypto.randomUUID(),
        organization_id: organizationId,
        entity_type: entityType,
        entity_id: entityId,
        file_name: file.name,
        mime_type: file.type,
        size: file.size,
        storage_path: 'mock/path',
        uploaded_by: 'local_user',
        created_at: new Date().toISOString()
      };
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    // Path structure: org_id/entity_type/entity_id/filename
    const storagePath = `${organizationId}/${entityType}/${entityId}/${fileName}`;

    // 1. Upload to storage bucket
    const { error: uploadError } = await supabase.storage
      .from('sbs-documents')
      .upload(storagePath, file);

    if (uploadError) {
      throw new Error(`Failed to upload file: ${uploadError.message}`);
    }

    // 2. Insert metadata into attachments table
    const { data: userData } = await supabase.auth.getUser();
    
    const { data: attachmentData, error: dbError } = await supabase
      .from('attachments')
      .insert({
        organization_id: organizationId,
        entity_type: entityType,
        entity_id: entityId,
        file_name: file.name,
        mime_type: file.type,
        size: file.size,
        storage_path: storagePath,
        uploaded_by: userData.user?.id
      })
      .select()
      .single();

    if (dbError) {
      // Rollback storage upload if DB insert fails
      await supabase.storage.from('sbs-documents').remove([storagePath]);
      throw new Error(`Failed to save attachment metadata: ${dbError.message}`);
    }

    return attachmentData;
  },

  /**
   * Generates a time-limited signed URL for viewing an attachment.
   */
  async createSignedUrl(storagePath: string, expiresInSeconds: number = 3600): Promise<string> {
    if (environment.dataProvider === 'local') {
      return '#mock-url';
    }

    // 1. Ownership Guard: Verify user has read access to the attachment record via RLS
    // If the user does not own the entity, this query will return 0 rows.
    const { data: attachmentRecord, error: dbError } = await supabase
      .from('attachments')
      .select('id')
      .eq('storage_path', storagePath)
      .single();

    if (dbError || !attachmentRecord) {
      throw new Error(`Unauthorized or file not found: ${dbError?.message || 'No access'}`);
    }

    // 2. Request Signed URL
    const { data, error } = await supabase.storage
      .from('sbs-documents')
      .createSignedUrl(storagePath, expiresInSeconds);

    if (error) {
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }

    return data.signedUrl;
  },

  /**
   * Soft-deletes an attachment (could be extended to hard delete).
   */
  async deleteAttachment(id: string, storagePath: string): Promise<void> {
    if (environment.dataProvider === 'local') return;

    // 1. Remove from DB (or soft delete by updating a status flag if added to schema)
    const { error: dbError } = await supabase
      .from('attachments')
      .delete()
      .eq('id', id);

    if (dbError) {
      throw new Error(`Failed to delete metadata: ${dbError.message}`);
    }

    // 2. Remove from Storage
    const { error: storageError } = await supabase.storage
      .from('sbs-documents')
      .remove([storagePath]);

    if (storageError) {
      console.error(`Warning: DB metadata deleted, but storage file cleanup failed for path ${storagePath}`);
    }
  },

  /**
   * Lists metadata for attachments associated with an entity.
   */
  async listAttachments(entityType: string, entityId: string): Promise<Attachment[]> {
    if (environment.dataProvider === 'local') return [];

    const { data, error } = await supabase
      .from('attachments')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch attachments: ${error.message}`);
    }

    return data;
  }
};
