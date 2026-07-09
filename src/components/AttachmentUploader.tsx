import React, { useState, useEffect } from 'react';
import { Paperclip, Trash2, Loader2, Eye, File as FileIcon } from 'lucide-react';
import { attachmentService, type Attachment } from '../services/attachmentService';
import toast from 'react-hot-toast';

interface AttachmentUploaderProps {
  entityType: string;
  entityId: string;
  organizationId: string;
}

export default function AttachmentUploader({ entityType, entityId, organizationId }: AttachmentUploaderProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadAttachments();
  }, [entityType, entityId]);

  const loadAttachments = async () => {
    try {
      setLoading(true);
      const data = await attachmentService.listAttachments(entityType, entityId);
      setAttachments(data);
    } catch (err: any) {
      console.error('Error loading attachments:', err);
      toast.error('Gagal memuat lampiran: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 5MB.');
      return;
    }

    try {
      setUploading(true);
      await attachmentService.uploadAttachment(file, entityType, entityId, organizationId);
      toast.success('File berhasil diunggah.');
      loadAttachments();
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error('Gagal mengunggah file: ' + err.message);
    } finally {
      setUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleView = async (attachment: Attachment) => {
    try {
      toast.loading('Membuka file...', { id: 'view_file' });
      const url = await attachmentService.createSignedUrl(attachment.storage_path);
      toast.dismiss('view_file');
      window.open(url, '_blank');
    } catch (err: any) {
      toast.dismiss('view_file');
      toast.error('Gagal membuka file: ' + err.message);
    }
  };

  const handleDelete = async (attachment: Attachment) => {
    if (!window.confirm(`Hapus file ${attachment.file_name}?`)) return;
    
    try {
      setDeletingId(attachment.id);
      await attachmentService.deleteAttachment(attachment.id, attachment.storage_path);
      toast.success('File berhasil dihapus.');
      loadAttachments();
    } catch (err: any) {
      toast.error('Gagal menghapus file: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  if (!entityId) {
    return (
      <div className="p-4 border rounded-md border-slate-200 bg-slate-50 text-slate-500 text-sm text-center">
        Simpan dokumen terlebih dahulu untuk melampirkan file.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-slate-900 flex items-center gap-2">
          <Paperclip className="h-4 w-4" />
          Lampiran ({attachments.length})
        </h4>
        <div>
          <input
            type="file"
            id={`file-upload-${entityId}`}
            className="hidden"
            onChange={handleUpload}
            accept="image/*,.pdf"
            disabled={uploading}
          />
          <label
            htmlFor={`file-upload-${entityId}`}
            className="cursor-pointer inline-flex items-center justify-center rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:opacity-50"
          >
            {uploading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mengunggah...</>
            ) : (
              <><Paperclip className="mr-2 h-4 w-4" /> Tambah File</>
            )}
          </label>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-4">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : attachments.length === 0 ? (
        <div className="text-center p-6 border-2 border-dashed border-slate-200 rounded-lg">
          <FileIcon className="mx-auto h-8 w-8 text-slate-300 mb-2" />
          <p className="text-sm text-slate-500">Belum ada lampiran.</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
          {attachments.map((file) => (
            <li key={file.id} className="flex items-center justify-between py-3 pl-3 pr-4 text-sm">
              <div className="flex w-0 flex-1 items-center gap-2">
                <FileIcon className="h-5 w-5 flex-shrink-0 text-slate-400" />
                <div className="flex min-w-0 flex-1 gap-2">
                  <span className="truncate font-medium">{file.file_name}</span>
                  <span className="flex-shrink-0 text-slate-400">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
              </div>
              <div className="ml-4 flex flex-shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => handleView(file)}
                  className="font-medium text-blue-600 hover:text-blue-500 flex items-center p-1 rounded hover:bg-blue-50"
                  title="Lihat / Download"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(file)}
                  disabled={deletingId === file.id}
                  className="font-medium text-red-600 hover:text-red-500 flex items-center p-1 rounded hover:bg-red-50 disabled:opacity-50"
                  title="Hapus"
                >
                  {deletingId === file.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
