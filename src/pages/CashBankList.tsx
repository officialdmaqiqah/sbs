import { useState, useMemo } from 'react';
import { cashBankService } from '../services/cashBankService';
import type { CashBankAccount } from '../types';
import { 
  useCashBankAccounts
} from '../hooks/useFinance';
import { useCashBankMutations } from '../hooks/useCashBankMutations';
import CashBankLedger from '../components/finance/CashBankLedger';
import { useProject } from '../contexts/ProjectContext';

export default function CashBankList() {
  const { activeProject, availableProjects } = useProject();
  const [projectFilter, setProjectFilter] = useState<string>(activeProject?.id || 'All');

  const { data: accounts, refetch: refetchAccounts } = useCashBankAccounts();
  const { accountBalances } = useCashBankMutations(projectFilter);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOpeningBalanceModalOpen, setIsOpeningBalanceModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<CashBankAccount | null>(null);
  const [ledgerAccount, setLedgerAccount] = useState<CashBankAccount | null>(null);
  
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All');
  
  const [formData, setFormData] = useState({
    account_code: '',
    account_name: '',
    account_type: 'Bank' as 'Cash' | 'Bank',
    gl_account_id: '',
    bank_name: '',
    bank_account_number: '',
    account_holder: '',
    notes: ''
  });

  const [obFormData, setObFormData] = useState({
    amount: 0,
    date: new Date().toISOString().split('T')[0]
  });



  const filteredAccounts = useMemo(() => {
    return accounts.filter(acc => {
      const matchSearch = acc.account_name.toLowerCase().includes(search.toLowerCase()) || acc.account_code.toLowerCase().includes(search.toLowerCase());
      const matchType = filterType === 'All' || acc.account_type === filterType;
      return matchSearch && matchType;
    });
  }, [accounts, search, filterType]);

  const handleSubmit = (e: any) => {
    e.preventDefault();
    try {
      if (selectedAccount) {
        cashBankService.updateCashBankAccount(selectedAccount.id, formData);
      } else {
        cashBankService.createCashBankAccount({
          ...formData,
          currency: 'IDR',
          opening_balance: 0,
          opening_balance_date: new Date().toISOString().split('T')[0],
          active: true
        }, 'Admin');
      }
      setIsModalOpen(false);
      refetchAccounts();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleOpeningBalanceSubmit = (e: any) => {
    e.preventDefault();
    if (!selectedAccount) return;
    try {
      cashBankService.postOpeningBalance(selectedAccount.id, obFormData.amount, obFormData.date, 'Admin');
      setIsOpeningBalanceModalOpen(false);
      refetchAccounts();
      alert('Opening balance posted successfully!');
    } catch (err: any) {
      alert(err.message);
    }
  };



  const openNewModal = () => {
    setSelectedAccount(null);
    setFormData({
      account_code: '', account_name: '', account_type: 'Bank', gl_account_id: '', bank_name: '', bank_account_number: '', account_holder: '', notes: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (acc: CashBankAccount) => {
    setSelectedAccount(acc);
    setFormData({
      account_code: acc.account_code, account_name: acc.account_name, account_type: acc.account_type, gl_account_id: acc.gl_account_id,
      bank_name: acc.bank_name || '', bank_account_number: acc.bank_account_number || '', account_holder: acc.account_holder || '', notes: acc.notes || ''
    });
    setIsModalOpen(true);
  };
  
  const exportCsv = () => {
    const headers = ['Account Code', 'Account Name', 'Type', 'Bank Name', 'Account Number', 'Balance', 'Status'];
    const rows = filteredAccounts.map((acc: any) => [
      acc.account_code,
      acc.account_name,
      acc.account_type,
      acc.bank_name || '',
      acc.bank_account_number || '',
      accountBalances[acc.id] || 0,
      acc.active ? 'Active' : 'Inactive'
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "cash_bank_accounts.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pos Kas & Bank</h1>
          <p className="text-slate-500 mt-1">Kelola daftar rekening bank dan kas tunai perusahaan.</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 border rounded" onClick={exportCsv}>Export CSV</button>
          <button className="px-4 py-2 border rounded bg-brand-600 text-white" onClick={openNewModal}>+ Tambah Kas/Bank</button>
        </div>
      </div>
      
      <div className="flex gap-4 mb-4">
        <input 
          placeholder="Cari kas/bank..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs bg-white border px-3 py-2 rounded"
        />
        <select 
          className="border border-slate-200 rounded-md p-2 bg-white"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="All">Semua Tipe</option>
          <option value="Cash">Hanya Kas Tunai</option>
          <option value="Bank">Hanya Bank</option>
        </select>
        <select 
          className="border border-brand-200 rounded-md p-2 bg-brand-50 text-brand-700 font-medium"
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
        >
          <option value="All">Semua Project (Global)</option>
          <option value="Non-Project">Non-Project</option>
          {availableProjects.map(p => (
            <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Kode</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nama Akun</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tipe</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Detail Bank</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Saldo Saat Ini</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {filteredAccounts.map(acc => {
              return (
                <tr key={acc.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-medium">{acc.account_code}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{acc.account_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{acc.account_type === 'Cash' ? 'Kas Tunai' : 'Bank'}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {acc.account_type === 'Bank' ? (
                      <div>
                        <div className="font-medium text-slate-700">{acc.bank_name}</div>
                        <div className="text-xs text-slate-500">{acc.bank_account_number}</div>
                      </div>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-slate-900">
                    Rp {(accountBalances[acc.id] || 0).toLocaleString('id-ID')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${acc.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {acc.active ? 'Aktif' : 'Non-Aktif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center space-x-2">
                    <button className="px-3 py-1 border rounded" onClick={() => setLedgerAccount(acc)}>Buku Kas</button>
                    <button className="px-3 py-1 border rounded" onClick={() => openEditModal(acc)}>Edit</button>
                  </td>
                </tr>
              );
            })}
            {filteredAccounts.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-sm text-slate-500">
                  No accounts found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Account Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold text-slate-900 mb-6">{selectedAccount ? 'Edit Kas/Bank' : 'Tambah Kas/Bank Baru'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label>Kode Akun</label>
                  <input className="w-full rounded border px-3 py-2" value={formData.account_code} onChange={e => setFormData({...formData, account_code: e.target.value})} required placeholder="Misal: KAS-01" />
                </div>
                <div className="space-y-1.5">
                  <label>Tipe</label>
                  <select className="w-full flex h-10 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50" value={formData.account_type} onChange={e => setFormData({...formData, account_type: e.target.value as any})}>
                    <option value="Cash">Kas Tunai</option>
                    <option value="Bank">Rekening Bank</option>
                  </select>
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label>Nama Kas / Bank</label>
                <input className="w-full rounded border px-3 py-2" value={formData.account_name} onChange={e => setFormData({...formData, account_name: e.target.value})} required placeholder="Misal: Kas Kecil Pusat" />
              </div>

              {formData.account_type === 'Bank' && (
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                  <div className="space-y-1.5">
                    <label>Nama Bank</label>
                    <input className="w-full rounded border px-3 py-2" value={formData.bank_name} onChange={e => setFormData({...formData, bank_name: e.target.value})} required={formData.account_type === 'Bank'} placeholder="Misal: BCA" />
                  </div>
                  <div className="space-y-1.5">
                    <label>Nomor Rekening</label>
                    <input className="w-full rounded border px-3 py-2" value={formData.bank_account_number} onChange={e => setFormData({...formData, bank_account_number: e.target.value})} required={formData.account_type === 'Bank'} placeholder="Misal: 1234567890" />
                  </div>
                  <div className="space-y-1.5">
                    <label>Atas Nama (Pemilik Rekening)</label>
                    <input className="w-full rounded border px-3 py-2" value={formData.account_holder} onChange={e => setFormData({...formData, account_holder: e.target.value})} required={formData.account_type === 'Bank'} placeholder="Misal: PT Berkah Sejahtera" />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label>Catatan</label>
                <input className="w-full rounded border px-3 py-2" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Catatan opsional" />
              </div>

              <div className="flex justify-end gap-3 pt-6">
                <button className="px-4 py-2 border rounded hover:bg-slate-50" type="button" onClick={() => setIsModalOpen(false)}>Batal</button>
                <button className="px-4 py-2 border rounded bg-brand-600 text-white hover:bg-brand-700" type="submit">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Opening Balance Modal */}
      {isOpeningBalanceModalOpen && selectedAccount && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Set Opening Balance</h2>
            <p className="text-sm text-slate-500 mb-6">For <strong>{selectedAccount.account_name}</strong>. This will generate an Opening Balance Equity journal.</p>
            <form onSubmit={handleOpeningBalanceSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label>Date</label>
                <input className="w-full rounded border px-3 py-2" type="date" value={obFormData.date} onChange={e => setObFormData({...obFormData, date: e.target.value})} required />
              </div>
              <div className="space-y-1.5">
                <label>Opening Balance Amount (Rp)</label>
                <input className="w-full rounded border px-3 py-2" type="number" min="0" value={obFormData.amount} onChange={e => setObFormData({...obFormData, amount: Number(e.target.value)})} required />
              </div>
              <div className="flex justify-end gap-3 pt-6">
                <button className="px-4 py-2 border rounded" type="button" onClick={() => setIsOpeningBalanceModalOpen(false)}>Cancel</button>
                <button className="px-4 py-2 border rounded bg-brand-600 text-white" type="submit">Post Journal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ledger Modal */}
      {ledgerAccount && (
        <CashBankLedger account={ledgerAccount} onClose={() => setLedgerAccount(null)} />
      )}

    </div>
  );
}
