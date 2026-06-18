import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Users, DollarSign, LayoutDashboard, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { useProject, type Project } from '../contexts/ProjectContext';
import { useCashBankMutations } from '../hooks/useCashBankMutations';
import { useCashBankAccounts } from '../hooks/useFinance';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'team' | 'capital'>('dashboard');

  const { activeProject, setActiveProject } = useProject();

  // Data
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [investments, setInvestments] = useState<any[]>([]);
  const { data: mutations } = useCashBankMutations();
  const { data: accounts } = useCashBankAccounts();

  useEffect(() => {
    if (id) {
      loadProjectData(id);
    }
  }, [id]);

  const loadProjectData = async (projectId: string) => {
    setLoading(true);
    try {
      // Fetch project details
      const { data: projData, error: projErr } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
      if (projErr) throw projErr;
      setProject(projData);

      // Fetch team members
      const { data: teamData } = await supabase
        .from('project_members')
        .select('*, profiles(full_name)')
        .eq('project_id', projectId);
      setTeamMembers(teamData || []);

      // Fetch capital/investments
      const { data: invData } = await supabase
        .from('project_investments')
        .select('*, investors(name)')
        .eq('project_id', projectId);
      setInvestments(invData || []);
    } catch (err: any) {
      console.error('Error loading project details', err);
      setError('Project tidak ditemukan atau mungkin sudah dihapus.');
    } finally {
      setLoading(false);
    }
  };

  const isCurrentActive = activeProject?.id === project?.id;

  if (error) {
    return (
      <div className="p-8 text-center bg-white rounded-xl shadow-sm border border-slate-200 space-y-4">
        <h3 className="text-lg font-bold text-slate-800">Ups, ada yang salah!</h3>
        <p className="text-slate-600">{error}</p>
        <Link to="/projects" className="inline-block mt-4 text-brand-600 hover:text-brand-800 font-medium">
          &larr; Kembali ke Daftar Project
        </Link>
      </div>
    );
  }

  // Render Tabs Logic (will implement sub-components later)
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <Link to="/projects" className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold leading-7 text-slate-900 sm:truncate sm:text-3xl sm:tracking-tight">
                {project?.name || 'Memuat...'}
              </h2>
              {project?.status === 'Aktif' ? <Badge variant="success">Aktif</Badge> : <Badge variant="default">{project?.status}</Badge>}
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Kode: {project?.code} | Mulai: {project?.start_date || '-'} | Target: {project?.target_notes || '-'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {!isCurrentActive && project?.status === 'Aktif' && (
            <button
              onClick={() => setActiveProject(project)}
              className="inline-flex items-center justify-center rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-500"
            >
              Jadikan Project Aktif
            </button>
          )}
          {isCurrentActive && (
            <div className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-sm font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Project Aktif Saat Ini
            </div>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium flex items-center gap-2 ${
              activeTab === 'dashboard'
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </button>
          <button
            onClick={() => setActiveTab('team')}
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium flex items-center gap-2 ${
              activeTab === 'team'
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            <Users className="w-4 h-4" /> Team Project
          </button>
          <button
            onClick={() => setActiveTab('capital')}
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium flex items-center gap-2 ${
              activeTab === 'capital'
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            <DollarSign className="w-4 h-4" /> Modal Project
          </button>
        </nav>
      </div>

      {/* Tab Contents */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        {loading ? (
          <div className="text-center py-10 text-slate-500">Memuat data project...</div>
        ) : (
          <>
            {activeTab === 'dashboard' && <ProjectDashboard project={project} mutations={mutations} />}
            {activeTab === 'team' && <ProjectTeam projectId={project?.id!} teamMembers={teamMembers} reload={() => loadProjectData(project?.id!)} />}
            {activeTab === 'capital' && <ProjectCapital projectId={project?.id!} investments={investments} reload={() => loadProjectData(project?.id!)} accounts={accounts} />}
          </>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// SUB-COMPONENTS
// ----------------------------------------------------------------------

function ProjectDashboard({ project, mutations }: { project: any, mutations: any[] }) {
  // Hitung metrik project
  const projMutations = useMemo(() => mutations.filter((m: any) => m.project_id === project?.id), [mutations, project]);

  const kasProject = useMemo(() => projMutations.reduce((sum, mut) => {
    if (mut.mutation_type === 'IN') return sum + mut.amount;
    if (mut.mutation_type === 'OUT') return sum - mut.amount;
    return sum;
  }, 0), [projMutations]);

  const totalModal = useMemo(() => projMutations.filter((m: any) => m.source_module === 'PROJECT_CAPITAL' && m.mutation_type === 'IN').reduce((sum, m) => sum + m.amount, 0), [projMutations]);
  const totalPembelian = useMemo(() => projMutations.filter((m: any) => m.source_module === 'AP' && m.mutation_type === 'OUT').reduce((sum, m) => sum + m.amount, 0), [projMutations]);
  const totalPenjualan = useMemo(() => projMutations.filter((m: any) => m.source_module === 'AR' && m.mutation_type === 'IN').reduce((sum, m) => sum + m.amount, 0), [projMutations]);

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-slate-900 mb-4">Ringkasan Project</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard title="Kas Project Saat Ini" value={kasProject} color="emerald" />
        <MetricCard title="Total Modal Masuk" value={totalModal} color="blue" />
        <MetricCard title="Total Penjualan (Tercatat)" value={totalPenjualan} color="indigo" />
        <MetricCard title="Total Pembelian (Terbayar)" value={totalPembelian} color="red" />
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <p className="text-sm font-medium text-slate-500 mb-1">Nilai Stok Project</p>
          <p className="text-xl font-bold text-slate-400 italic">Belum ada transaksi</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <p className="text-sm font-medium text-slate-500 mb-1">Estimasi Laba/Rugi</p>
          <p className="text-xl font-bold text-slate-400 italic">Belum ada transaksi</p>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, color }: { title: string, value: number, color: string }) {
  const colorMap: any = {
    emerald: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    blue: 'text-blue-700 bg-blue-50 border-blue-200',
    indigo: 'text-indigo-700 bg-indigo-50 border-indigo-200',
    red: 'text-red-700 bg-red-50 border-red-200',
  };
  return (
    <div className={`border rounded-lg p-4 ${colorMap[color]}`}>
      <p className="text-sm font-medium opacity-80 mb-1">{title}</p>
      <p className="text-2xl font-bold">Rp {value.toLocaleString('id-ID')}</p>
    </div>
  );
}

function ProjectTeam({ projectId, teamMembers, reload }: { projectId: string, teamMembers: any[], reload: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('CEO');

  const handleAdd = async (e: any) => {
    e.preventDefault();
    try {
      await supabase.from('project_members').insert({
        project_id: projectId,
        member_name: name,
        role: role,
        // user_id is null for now to support non-account workers
      });
      setIsOpen(false);
      setName('');
      reload();
    } catch (err) {
      console.error(err);
      alert('Gagal menambah tim');
    }
  };

  const handleDelete = async (id: string) => {
    if(confirm('Hapus anggota tim ini?')) {
      await supabase.from('project_members').delete().eq('id', id);
      reload();
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-slate-900">Team Project</h3>
        <button onClick={() => setIsOpen(true)} className="flex items-center gap-2 bg-brand-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-brand-500">
          <Plus className="w-4 h-4" /> Tambah Anggota
        </button>
      </div>

      <table className="min-w-full divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Nama Anggota</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Jabatan</th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {teamMembers.length === 0 ? (
            <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-500">Belum ada tim project</td></tr>
          ) : teamMembers.map(member => (
            <tr key={member.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 text-sm text-slate-900">{member.member_name || member.profiles?.full_name}</td>
              <td className="px-4 py-3 text-sm text-slate-500">{member.role}</td>
              <td className="px-4 py-3 text-right">
                <button onClick={() => handleDelete(member.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4 inline"/></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Tambah Anggota Tim">
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Nama Anggota</label>
            <input required type="text" className="mt-1 block w-full rounded-md border-slate-300 py-2 px-3 text-sm border focus:ring-brand-500 focus:border-brand-500" value={name} onChange={e => setName(e.target.value)} />
            <p className="text-xs text-slate-500 mt-1">Nama pekerja/karyawan tanpa harus membuat akun sistem.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Jabatan Project</label>
            <select className="mt-1 block w-full rounded-md border-slate-300 py-2 px-3 text-sm border focus:ring-brand-500 focus:border-brand-500" value={role} onChange={e => setRole(e.target.value)}>
              <option value="CEO">CEO / Penanggung Jawab</option>
              <option value="Finance & Marketing">Finance & Marketing</option>
              <option value="Produksi">Produksi</option>
              <option value="Distribusi">Distribusi</option>
            </select>
          </div>
          <div className="pt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 border rounded-md text-sm text-slate-700 hover:bg-slate-50">Batal</button>
            <button type="submit" className="px-4 py-2 bg-brand-600 text-white rounded-md text-sm hover:bg-brand-500">Simpan</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function ProjectCapital({ projectId, investments, reload, accounts }: { projectId: string, investments: any[], reload: () => void, accounts: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState<number | string>('');
  const [paymentMethod, setPaymentMethod] = useState('Kas Tunai');
  const [cashBankId, setCashBankId] = useState('');
  const [notes, setNotes] = useState('');

  const handleAdd = async (e: any) => {
    e.preventDefault();
    try {
      const { data: orgData } = await supabase.from('projects').select('organization_id').eq('id', projectId).single();
      
      // Upsert Investor if name doesn't exist to keep simple
      const { data: invData } = await supabase.from('investors').insert({
        organization_id: orgData?.organization_id || '00000000-0000-0000-0000-000000000000',
        name: name
      }).select().single();

      await supabase.from('project_investments').insert({
        project_id: projectId,
        investor_id: invData.id,
        amount: Number(amount),
        payment_method: paymentMethod,
        cash_bank_id: cashBankId || null,
        notes: notes,
        status: 'Confirmed'
      });
      setIsOpen(false);
      setName('');
      setAmount('');
      reload();
    } catch (err) {
      console.error(err);
      alert('Gagal menambah modal');
    }
  };

  const syncToCash = async (inv: any) => {
    if(!inv.cash_bank_id) return alert('Pilih akun Kas/Bank terlebih dahulu sebelum sinkronasi.');
    if(confirm(`Catat uang masuk Rp ${inv.amount.toLocaleString('id-ID')} ke Kas?`)) {
      try {
        await supabase.from('cash_bank_mutations').insert({
          mutation_type: 'IN',
          to_cash_bank_id: inv.cash_bank_id,
          project_id: projectId,
          amount: inv.amount,
          source_module: 'PROJECT_CAPITAL',
          reference_type: 'PROJECT_CAPITAL',
          reference_id: inv.id,
          mutation_date: new Date().toISOString().split('T')[0],
          notes: `Setoran Modal dari ${inv.investors?.name} - ${inv.notes || ''}`
        });

        await supabase.from('project_investments').update({ is_synced_to_cash: true }).eq('id', inv.id);
        reload();
        alert('Sukses mencatat ke mutasi Kas!');
      } catch (e: any) {
        console.error(e);
        alert('Gagal menyinkronkan: ' + e.message);
      }
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-slate-900">Modal Investor Internal</h3>
        <button onClick={() => setIsOpen(true)} className="flex items-center gap-2 bg-brand-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-brand-500">
          <Plus className="w-4 h-4" /> Input Modal
        </button>
      </div>

      <table className="min-w-full divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Investor</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Nominal</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Metode</th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900">Status Kas</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {investments.length === 0 ? (
            <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Belum ada modal tercatat</td></tr>
          ) : investments.map(inv => (
            <tr key={inv.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 text-sm text-slate-900 font-medium">{inv.investors?.name}</td>
              <td className="px-4 py-3 text-sm text-slate-900">Rp {Number(inv.amount).toLocaleString('id-ID')}</td>
              <td className="px-4 py-3 text-sm text-slate-500">{inv.payment_method}</td>
              <td className="px-4 py-3 text-right">
                {inv.is_synced_to_cash ? (
                  <Badge variant="success">Tercatat di Kas</Badge>
                ) : (
                  <button onClick={() => syncToCash(inv)} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded border border-indigo-200 hover:bg-indigo-100">
                    Catat ke Kas
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Input Modal Investor">
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Nama Investor Internal</label>
            <input required type="text" className="mt-1 block w-full rounded-md border-slate-300 py-2 px-3 text-sm border focus:ring-brand-500 focus:border-brand-500" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Nominal Modal (Rp)</label>
            <input required type="number" min="0" className="mt-1 block w-full rounded-md border-slate-300 py-2 px-3 text-sm border focus:ring-brand-500 focus:border-brand-500" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Metode Setor</label>
            <select className="mt-1 block w-full rounded-md border-slate-300 py-2 px-3 text-sm border focus:ring-brand-500 focus:border-brand-500" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
              <option value="Kas Tunai">Kas Tunai</option>
              <option value="Bank">Bank / Transfer</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Pilih Rekening Tujuan (Opsional)</label>
            <select className="mt-1 block w-full rounded-md border-slate-300 py-2 px-3 text-sm border focus:ring-brand-500 focus:border-brand-500" value={cashBankId} onChange={e => setCashBankId(e.target.value)}>
              <option value="">-- Pilih Rekening --</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name} ({acc.account_type})</option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">Jika dipilih, Anda dapat menggunakan tombol "Catat ke Kas" nantinya.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Catatan</label>
            <textarea className="mt-1 block w-full rounded-md border-slate-300 py-2 px-3 text-sm border focus:ring-brand-500 focus:border-brand-500" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <div className="pt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 border rounded-md text-sm text-slate-700 hover:bg-slate-50">Batal</button>
            <button type="submit" className="px-4 py-2 bg-brand-600 text-white rounded-md text-sm hover:bg-brand-500">Simpan</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
