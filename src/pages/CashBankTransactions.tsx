import { useState, useMemo } from 'react';
import { useCashBankMutations } from '../hooks/useCashBankMutations';
import type { CashBankMutation } from '../hooks/useCashBankMutations';
import { useCashBankAccounts } from '../hooks/useFinance';
import { useProjects } from '../hooks/useProjects';
import { useProject } from '../contexts/ProjectContext';
import toast from 'react-hot-toast';
import { CurrencyInput } from '../components/ui/CurrencyInput';
import AttachmentUploader from '../components/AttachmentUploader';
import { Paperclip } from 'lucide-react';

export default function CashBankTransactions() {
  const { data: mutations, createMutation, accountBalances } = useCashBankMutations();
  const { data: accounts } = useCashBankAccounts();
  const { data: projects } = useProjects();
  const { activeProject } = useProject();
  
  const [activeTab, setActiveTab] = useState<'All' | 'IN' | 'OUT' | 'TRANSFER'>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<CashBankMutation | null>(null);
  const [newTxId, setNewTxId] = useState<string | null>(null);
  const [txAttachmentModalId, setTxAttachmentModalId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    mutation_type: 'IN' as 'IN' | 'OUT' | 'TRANSFER',
    mutation_date: new Date().toISOString().split('T')[0],
    from_cash_bank_id: '',
    to_cash_bank_id: '',
    project_id: '',
    amount: 0,
    notes: '',
    reference: ''
  });

  const activeAccounts = useMemo(() => accounts.filter(a => a.active), [accounts]);

  const filteredMutations = useMemo(() => {
    return mutations.filter(tx => activeTab === 'All' || tx.mutation_type === activeTab);
  }, [mutations, activeTab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.amount <= 0) {
      toast.error('Jumlah uang harus lebih dari 0');
      return;
    }

    const payload: Omit<CashBankMutation, 'id' | 'created_at'> & { id?: string } = {
      mutation_date: formData.mutation_date,
      mutation_type: formData.mutation_type,
      amount: formData.amount,
      notes: formData.reference ? `${formData.notes} (Ref: ${formData.reference})` : formData.notes,
      project_id: formData.project_id || null,
      from_cash_bank_id: formData.mutation_type !== 'IN' ? formData.from_cash_bank_id : null,
      to_cash_bank_id: formData.mutation_type !== 'OUT' ? formData.to_cash_bank_id : null,
      source_module: 'Manual Input',
      id: newTxId || undefined
    };

    const res = await createMutation(payload);
    if (res.success) {
      setIsModalOpen(false);
      toast.success('Mutasi berhasil dicatat!');
    } else {
      toast.error('Error: ' + res.message);
    }
  };

  const openNewModal = (type: 'IN' | 'OUT' | 'TRANSFER') => {
    setFormData({
      mutation_type: type,
      mutation_date: new Date().toISOString().split('T')[0],
      from_cash_bank_id: '',
      to_cash_bank_id: '',
      project_id: activeProject?.id || '',
      amount: 0,
      notes: '',
      reference: ''
    });
    setNewTxId(crypto.randomUUID());
    setIsModalOpen(true);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Uang Masuk / Keluar / Mutasi</h1>
          <p className="text-slate-500 mt-1">Catat penerimaan, pengeluaran, dan pindah buku antar kas/bank (Non-Jurnal).</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 border rounded bg-green-50 text-green-700 hover:bg-green-100" onClick={() => openNewModal('IN')}>+ Uang Masuk</button>
          <button className="px-4 py-2 border rounded bg-red-50 text-red-700 hover:bg-red-100" onClick={() => openNewModal('OUT')}>+ Uang Keluar</button>
          <button className="px-4 py-2 border rounded bg-blue-50 text-blue-700 hover:bg-blue-100" onClick={() => openNewModal('TRANSFER')}>+ Mutasi / Pindah</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 border-b border-slate-200">
        {[
          { id: 'All', label: 'Semua Transaksi' },
          { id: 'IN', label: 'Uang Masuk' },
          { id: 'OUT', label: 'Uang Keluar' },
          { id: 'TRANSFER', label: 'Mutasi' }
        ].map(tab => (
          <button
            key={tab.id}
            className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id 
                ? 'border-brand-500 text-brand-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
            onClick={() => setActiveTab(tab.id as any)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tanggal</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tipe</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Dari / Ke Kas</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Deskripsi & Project</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Jumlah (Rp)</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {filteredMutations.map((tx: any) => {
              const srcAcc = tx.from_cash_bank_id ? (accounts.find(a => a.id === tx.from_cash_bank_id)?.account_name || '-') : '-';
              const destAcc = tx.to_cash_bank_id ? (accounts.find(a => a.id === tx.to_cash_bank_id)?.account_name || '-') : '-';
              const projectName = tx.project?.project_name || '-';
                
              return (
                <tr key={tx.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900">{tx.mutation_date}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      tx.mutation_type === 'IN' ? 'bg-green-100 text-green-800' :
                      tx.mutation_type === 'OUT' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {tx.mutation_type === 'IN' ? 'Uang Masuk' : tx.mutation_type === 'OUT' ? 'Uang Keluar' : 'Mutasi'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-900">
                      {tx.mutation_type === 'IN' && `Ke: ${destAcc}`}
                      {tx.mutation_type === 'OUT' && `Dari: ${srcAcc}`}
                      {tx.mutation_type === 'TRANSFER' && `${srcAcc} ➔ ${destAcc}`}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-900 line-clamp-1">{tx.notes}</div>
                    <div className="text-xs text-slate-500">Project: {projectName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-slate-900">
                    {tx.amount.toLocaleString('id-ID')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-slate-900">
                    <button onClick={() => setTxAttachmentModalId(tx.id)} className="text-slate-500 hover:text-slate-700 mr-3" title="Lampiran">
                      <Paperclip className="h-4 w-4 inline" />
                    </button>
                    <button onClick={() => { setSelectedTx(tx); setIsDetailModalOpen(true); }} className="text-brand-600 hover:text-brand-900 font-bold">Detail</button>
                  </td>
                </tr>
              );
            })}
            {filteredMutations.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-sm text-slate-500">
                  Tidak ada transaksi mutasi.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Transaction Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-slate-900 mb-6">
              Catat {formData.mutation_type === 'IN' ? 'Uang Masuk' : formData.mutation_type === 'OUT' ? 'Uang Keluar' : 'Mutasi Kas'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Tanggal Transaksi</label>
                  <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500" type="date" value={formData.mutation_date} onChange={e => setFormData({...formData, mutation_date: e.target.value})} required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Jumlah (Rp)</label>
                  <CurrencyInput className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500"  min="1" value={formData.amount} onChange={(val) => setFormData({...formData, amount: val})} required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {formData.mutation_type !== 'IN' && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Sumber Dana (Dari)</label>
                    <select className="w-full h-10 rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500" value={formData.from_cash_bank_id} onChange={e => setFormData({...formData, from_cash_bank_id: e.target.value})} required>
                      <option value="">Pilih Kas/Bank Sumber</option>
                      {activeAccounts.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.account_name} (Rp {(accountBalances[a.id] || 0).toLocaleString('id-ID')})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                {formData.mutation_type !== 'OUT' && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Tujuan Dana (Ke)</label>
                    <select className="w-full h-10 rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500" value={formData.to_cash_bank_id} onChange={e => setFormData({...formData, to_cash_bank_id: e.target.value})} required>
                      <option value="">Pilih Kas/Bank Tujuan</option>
                      {activeAccounts.filter(a => a.id !== formData.from_cash_bank_id).map(a => (
                        <option key={a.id} value={a.id}>
                          {a.account_name} (Rp {(accountBalances[a.id] || 0).toLocaleString('id-ID')})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Project (Opsional)</label>
                <select className="w-full h-10 rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500" value={formData.project_id} onChange={e => setFormData({...formData, project_id: e.target.value})}>
                  <option value="">-- Bukan Transaksi Project --</option>
                  {projects.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-500">Pilih project jika mutasi ini berkaitan dengan biaya/pendapatan project tertentu.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Keterangan / Catatan</label>
                <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} required placeholder="Misal: Biaya bensin operasional" />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Nomor Referensi (Opsional)</label>
                <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500" value={formData.reference} onChange={e => setFormData({...formData, reference: e.target.value})} placeholder="Misal: BUKTI-001" />
              </div>

              {newTxId && (
                <div className="pt-4 border-t border-slate-100 mt-4">
                  <AttachmentUploader
                    entityType="cash_mutation"
                    entityId={newTxId}
                    organizationId={'00000000-0000-0000-0000-000000000000'}
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-4">
                <button className="px-4 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 font-medium text-sm transition-colors" type="button" onClick={() => setIsModalOpen(false)}>Batal</button>
                <button className="px-4 py-2 border border-transparent rounded-md bg-brand-600 text-white font-medium text-sm hover:bg-brand-700 transition-colors" type="submit">Simpan Mutasi</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {isDetailModalOpen && selectedTx && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Detail Mutasi</h2>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between border-b pb-2 border-slate-100">
                <span className="text-slate-500 font-medium">Tipe</span>
                <span className="text-slate-900 font-bold">{selectedTx.mutation_type === 'IN' ? 'Uang Masuk' : selectedTx.mutation_type === 'OUT' ? 'Uang Keluar' : 'Mutasi (Pindah Buku)'}</span>
              </div>
              <div className="flex justify-between border-b pb-2 border-slate-100">
                <span className="text-slate-500 font-medium">Tanggal</span>
                <span className="text-slate-900">{selectedTx.mutation_date}</span>
              </div>
              <div className="flex justify-between border-b pb-2 border-slate-100">
                <span className="text-slate-500 font-medium">Jumlah</span>
                <span className="text-green-600 font-bold text-lg">Rp {selectedTx.amount.toLocaleString('id-ID')}</span>
              </div>
              
              {selectedTx.mutation_type !== 'IN' && (
                <div className="flex justify-between border-b pb-2 border-slate-100">
                  <span className="text-slate-500 font-medium">Sumber (Dari)</span>
                  <span className="text-slate-900">{accounts.find(a => a.id === selectedTx.from_cash_bank_id)?.account_name || '-'}</span>
                </div>
              )}
              {selectedTx.mutation_type !== 'OUT' && (
                <div className="flex justify-between border-b pb-2 border-slate-100">
                  <span className="text-slate-500 font-medium">Tujuan (Ke)</span>
                  <span className="text-slate-900">{accounts.find(a => a.id === selectedTx.to_cash_bank_id)?.account_name || '-'}</span>
                </div>
              )}

              <div className="flex flex-col border-b pb-2 border-slate-100 space-y-1">
                <span className="text-slate-500 font-medium">Keterangan</span>
                <span className="text-slate-900 p-2 bg-slate-50 rounded italic">{selectedTx.notes}</span>
              </div>
              
              <div className="flex justify-between border-b pb-2 border-slate-100">
                <span className="text-slate-500 font-medium">Project Terkait</span>
                <span className="text-slate-900">{(selectedTx as any).project?.name || 'Tidak ada'}</span>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <button className="px-4 py-2 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 font-medium text-sm transition-colors" type="button" onClick={() => setIsDetailModalOpen(false)}>Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* Attachment Modal for Existing Tx */}
      {txAttachmentModalId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Lampiran Transaksi</h2>
            <AttachmentUploader
              entityType="cash_mutation"
              entityId={txAttachmentModalId}
              organizationId={'00000000-0000-0000-0000-000000000000'}
            />
            <div className="mt-6 flex justify-end">
              <button type="button" onClick={() => setTxAttachmentModalId(null)} className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-50">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
