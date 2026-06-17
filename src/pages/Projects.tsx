import { useState, useMemo } from 'react'; 
import { Link } from 'react-router-dom';
import { Plus, Search, Edit, AlertTriangle } from 'lucide-react';
import type { ProjectStatus } from '../types';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { useProjects } from '../hooks/useProjects';
import { useProject } from '../contexts/ProjectContext';
import { getDataProvider } from '../providers';

export default function Projects() {
  const { data: rawProjects, loading, error, refetch } = useProjects();
  const { refreshProjects } = useProject();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'All'>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('Draft');
  const [startDate, setStartDate] = useState('');
  const [expectedEndDate, setExpectedEndDate] = useState('');
  const [targetNotes, setTargetNotes] = useState('');

  const projects = useMemo(() => {
    let data = rawProjects || [];
    if (statusFilter !== 'All') {
      data = data.filter((p: any) => p.status === statusFilter);
    }
    if (search) {
      data = data.filter((p: any) => 
        (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.code || '').toLowerCase().includes(search.toLowerCase())
      );
    }
    return data;
  }, [rawProjects, search, statusFilter]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    try {
      const repo = getDataProvider().getProjectRepository();
      const payload = {
        code,
        name,
        status,
        startDate: startDate || null,
        endDate: expectedEndDate || null,
        targetNotes: targetNotes || null,
      };

      if (editingProject) {
        await repo.updateProject(editingProject.id, payload);
      } else {
        await repo.createProject(payload);
      }
      setIsModalOpen(false);
      refetch();
      await refreshProjects();
      resetForm();
    } catch (err: any) {
      setSaveError(err.message || 'Gagal menyimpan project');
    } finally {
      setIsSaving(false);
    }
  };

  const openEditModal = (project: any) => {
    setEditingProject(project);
    setName(project.name || '');
    setCode(project.code || '');
    setStatus(project.status || 'Draft');
    setStartDate(project.startDate || project.start_date || '');
    setExpectedEndDate(project.endDate || project.end_date || project.expected_end_date || '');
    setTargetNotes(project.targetNotes || project.target_notes || '');
    setSaveError(null);
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingProject(null);
    setName('');
    setCode('');
    setStatus('Draft');
    setStartDate('');
    setExpectedEndDate('');
    setTargetNotes('');
    setSaveError(null);
  };

  const getStatusBadge = (status: ProjectStatus) => {
    switch (status) {
      case 'Aktif': return <Badge variant="success">Aktif</Badge>;
      case 'Draft': return <Badge variant="default">Draft</Badge>;
      case 'Selesai Produksi': return <Badge variant="info">Selesai Produksi</Badge>;
      case 'Selesai Penjualan': return <Badge variant="warning">Selesai Penjualan</Badge>;
      case 'Tutup Buku': return <Badge variant="danger">Tutup Buku</Badge>;
      default: return <Badge variant="default">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold leading-7 text-slate-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Projects
          </h2>
          <p className="mt-1 text-sm text-slate-500">Kelola daftar project kemitraan Anda.</p>
        </div>
        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="inline-flex items-center gap-x-2 rounded-md bg-brand-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        >
          <Plus className="-ml-0.5 h-5 w-5" aria-hidden="true" />
          Project Baru
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-slate-400" aria-hidden="true" />
          </div>
          <input
            type="text"
            className="block w-full rounded-md border-0 py-1.5 pl-10 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6"
            placeholder="Cari project..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="block w-full sm:w-48 rounded-md border-0 py-1.5 pl-3 pr-10 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm sm:leading-6"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
        >
          <option value="All">Semua Status</option>
          <option value="Draft">Draft</option>
          <option value="Aktif">Aktif</option>
          <option value="Selesai Produksi">Selesai Produksi</option>
          <option value="Selesai Penjualan">Selesai Penjualan</option>
          <option value="Tutup Buku">Tutup Buku</option>
        </select>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-900 sm:pl-6">Kode</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Nama Project</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Status</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Mulai</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Selesai</th>
                <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                  <span className="sr-only">Aksi</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-slate-500">Memuat data...</td>
                </tr>
              ) : projects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-slate-500">
                    Tidak ada project ditemukan.
                    <span className="text-xs text-slate-400 mt-2 block">Mulai dengan membuat project baru. Semua transaksi SBS akan dicatat berdasarkan project.</span>
                  </td>
                </tr>
              ) : projects.map((project) => (
                <tr key={project.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-slate-900 sm:pl-6">
                    {project.code || '-'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-brand-600">
                    <Link to={`/projects/${project.id}`} className="hover:text-brand-900">
                      {project.name}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                    {getStatusBadge(project.status)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                    {project.start_date || '-'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                    {project.expected_end_date || '-'}
                  </td>
                  <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                    <button onClick={() => openEditModal(project)} className="text-brand-600 hover:text-brand-900 mr-4">
                      <Edit className="h-4 w-4 inline" /> Edit
                    </button>
                    <Link to={`/projects/${project.id}`} className="text-brand-600 hover:text-brand-900">
                      Detail
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProject ? "Edit Project" : "Project Baru"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {saveError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
              <div className="flex items-center">
                <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
                <p className="text-sm text-red-700">{saveError}</p>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="code" className="block text-sm font-medium leading-6 text-slate-900">Kode Project</label>
              <div className="mt-2">
                <input
                  type="text"
                  id="code"
                  required
                  className="block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="name" className="block text-sm font-medium leading-6 text-slate-900">Nama Project</label>
              <div className="mt-2">
                <input
                  type="text"
                  id="name"
                  required
                  className="block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          <div>
            <label htmlFor="status" className="block text-sm font-medium leading-6 text-slate-900">Status</label>
            <div className="mt-2">
              <select
                id="status"
                className="block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
              >
                <option value="Draft">Draft</option>
                <option value="Aktif">Aktif</option>
                <option value="Selesai Produksi">Selesai Produksi</option>
                <option value="Selesai Penjualan">Selesai Penjualan</option>
                <option value="Tutup Buku">Tutup Buku</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="start_date" className="block text-sm font-medium leading-6 text-slate-900">Tanggal Mulai</label>
              <div className="mt-2">
                <input
                  type="date"
                  id="start_date"
                  className="block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label htmlFor="end_date" className="block text-sm font-medium leading-6 text-slate-900">Estimasi Selesai</label>
              <div className="mt-2">
                <input
                  type="date"
                  id="end_date"
                  className="block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6"
                  value={expectedEndDate}
                  onChange={(e) => setExpectedEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="target_notes" className="block text-sm font-medium leading-6 text-slate-900">Target / Catatan Project</label>
            <div className="mt-2">
              <textarea
                id="target_notes"
                rows={3}
                className="block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6"
                placeholder="Contoh: DOC Ayam Broiler 500 Ekor. Estimasi panen 35 hari."
                value={targetNotes}
                onChange={(e) => setTargetNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex w-full justify-center rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 sm:col-start-2 disabled:opacity-50"
            >
              {isSaving ? 'Menyimpan...' : 'Simpan'}
            </button>
            <button
              type="button"
              disabled={isSaving}
              className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 sm:col-start-1 sm:mt-0 disabled:opacity-50"
              onClick={() => setIsModalOpen(false)}
            >
              Batal
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
