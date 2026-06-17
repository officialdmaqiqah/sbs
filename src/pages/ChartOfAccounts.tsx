import { useState, useEffect } from 'react';

import { accountingService } from '../services/accountingService';
import type { Account, AccountType } from '../types';
import { Plus, Search, Edit2, Ban, Info, Check, X } from 'lucide-react';

export default function ChartOfAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<AccountType | 'All'>('All');
  const [activeFilter, setActiveFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<Account>>({
    account_code: '', account_name: '', account_type: 'Asset', normal_balance: 'Debit',
    allow_posting: true, project_required: false, is_active: true
  });

  const [selectedAccDetails, setSelectedAccDetails] = useState<any>(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = () => {
    accountingService.seedDefaultChartOfAccounts();
    setAccounts(accountingService.getAccounts());
  };

  const handleSave = () => {
    try {
      if (editingId) {
        accountingService.updateAccount(editingId, formData);
      } else {
        accountingService.createAccount(formData as any);
      }
      setShowModal(false);
      loadAccounts();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDeactivate = (id: string) => {
    if (confirm('Are you sure you want to deactivate this account? It cannot be used in new journals.')) {
      try {
        accountingService.updateAccount(id, { is_active: false });
        loadAccounts();
      } catch (e: any) {
        alert(e.message);
      }
    }
  };

  const showDetails = (acc: Account) => {
    const usage = accountingService.getAccountUsageCount(acc.id);
    const lastDate = accountingService.getLastAccountUsageDate(acc.id);
    setSelectedAccDetails({ ...acc, usage, lastDate });
  };

  // Build hierarchy
  const accountMap = new Map<string, Account>();
  accounts.forEach(a => accountMap.set(a.id, a));

  const filtered = accounts.filter(a => {
    if (typeFilter !== 'All' && a.account_type !== typeFilter) return false;
    if (activeFilter === 'Active' && !a.is_active) return false;
    if (activeFilter === 'Inactive' && a.is_active) return false;
    if (search && !(a.account_code.includes(search) || a.account_name.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Chart of Accounts</h1>
        <button className="px-4 py-2 border rounded bg-brand-600 text-white" onClick={() => { setEditingId(null); setFormData({ account_code: '', account_name: '', account_type: 'Asset', normal_balance: 'Debit', allow_posting: true, project_required: false, is_active: true }); setShowModal(true); }}>
          <Plus className="w-4 h-4 mr-2 inline-block" /> New Account
        </button>
      </div>

      <div className="flex gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
          <input type="text" placeholder="Search code or name..." className="pl-10 pr-4 py-2 w-full border rounded-lg" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="border rounded-lg px-4" value={typeFilter} onChange={e => setTypeFilter(e.target.value as any)}>
          <option value="All">All Types</option>
          <option value="Asset">Asset</option>
          <option value="Liability">Liability</option>
          <option value="Equity">Equity</option>
          <option value="Revenue">Revenue</option>
          <option value="Cost of Goods Sold">COGS</option>
          <option value="Expense">Expense</option>
        </select>
        <select className="border rounded-lg px-4" value={activeFilter} onChange={e => setActiveFilter(e.target.value as any)}>
          <option value="All">All Status</option>
          <option value="Active">Active Only</option>
          <option value="Inactive">Inactive Only</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="p-4 font-medium text-gray-600">Code</th>
              <th className="p-4 font-medium text-gray-600">Account Name</th>
              <th className="p-4 font-medium text-gray-600">Type</th>
              <th className="p-4 font-medium text-gray-600">Attributes</th>
              <th className="p-4 font-medium text-gray-600">Status</th>
              <th className="p-4 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(acc => {
              const depth = acc.parent_account_id ? 1 : 0; // simplistic depth
              return (
                <tr key={acc.id} className="border-b hover:bg-gray-50">
                  <td className="p-4 font-mono text-sm" style={{ paddingLeft: `${depth * 2 + 1}rem` }}>
                    {acc.account_code}
                  </td>
                  <td className="p-4 font-medium" style={{ paddingLeft: `${depth * 2 + 1}rem` }}>
                    {acc.account_name}
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">{acc.account_type}</span>
                  </td>
                  <td className="p-4 flex gap-2 flex-wrap">
                    {!acc.allow_posting && <span className="px-2 py-1 bg-gray-200 text-gray-800 rounded text-xs font-bold">HEADER</span>}
                    {acc.allow_posting && <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">POSTING</span>}
                    {acc.project_required && <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">PROJECT REQ</span>}
                    <span className="px-2 py-1 border rounded text-xs">{acc.normal_balance}</span>
                  </td>
                  <td className="p-4">
                    {acc.is_active ? <span className="text-green-600 font-medium text-sm flex items-center"><Check className="w-4 h-4 mr-1"/> Active</span> : <span className="text-red-500 font-medium text-sm flex items-center"><X className="w-4 h-4 mr-1"/> Inactive</span>}
                  </td>
                  <td className="p-4 flex gap-2">
                    <button onClick={() => showDetails(acc)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Details"><Info className="w-4 h-4"/></button>
                    <button onClick={() => {
                      setEditingId(acc.id);
                      setFormData(acc);
                      setShowModal(true);
                    }} className="p-1 text-gray-600 hover:bg-gray-100 rounded" title="Edit"><Edit2 className="w-4 h-4"/></button>
                    {acc.is_active && (
                      <button onClick={() => handleDeactivate(acc.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Deactivate"><Ban className="w-4 h-4"/></button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg space-y-4">
            <h2 className="text-xl font-bold">{editingId ? 'Edit Account' : 'New Account'}</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Account Code</label>
                <input className="w-full border p-2 rounded" value={formData.account_code} onChange={e => setFormData({...formData, account_code: e.target.value})} disabled={!!editingId && accountingService.isAccountUsedInJournal(editingId)}/>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Account Name</label>
                <input className="w-full border p-2 rounded" value={formData.account_name} onChange={e => setFormData({...formData, account_name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Account Type</label>
                <select className="w-full border p-2 rounded" value={formData.account_type} onChange={e => setFormData({...formData, account_type: e.target.value as any})} disabled={!!editingId && accountingService.isAccountUsedInJournal(editingId)}>
                  <option value="Asset">Asset</option>
                  <option value="Liability">Liability</option>
                  <option value="Equity">Equity</option>
                  <option value="Revenue">Revenue</option>
                  <option value="Cost of Goods Sold">COGS</option>
                  <option value="Expense">Expense</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Normal Balance</label>
                <select className="w-full border p-2 rounded" value={formData.normal_balance} onChange={e => setFormData({...formData, normal_balance: e.target.value as any})}>
                  <option value="Debit">Debit</option>
                  <option value="Credit">Credit</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Parent Account (Optional)</label>
                <select className="w-full border p-2 rounded" value={formData.parent_account_id || ''} onChange={e => setFormData({...formData, parent_account_id: e.target.value || undefined})}>
                  <option value="">-- None --</option>
                  {accounts.filter(a => !a.allow_posting && a.id !== editingId).map(a => (
                    <option key={a.id} value={a.id}>{a.account_code} - {a.account_name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="space-y-2 mt-4">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={formData.allow_posting} onChange={e => setFormData({...formData, allow_posting: e.target.checked})} />
                Allow Posting (Uncheck to make this a Header account)
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={formData.project_required} onChange={e => setFormData({...formData, project_required: e.target.checked})} />
                Require Project Tagging
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <button className="px-4 py-2 border rounded" type="button" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="px-4 py-2 border rounded bg-brand-600 text-white" onClick={handleSave}>Save</button>
            </div>
          </div>
        </div>
      )}

      {selectedAccDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm space-y-4">
            <h2 className="text-xl font-bold text-gray-800">Account Details</h2>
            <div className="space-y-2 text-sm">
              <p><strong>Code:</strong> {selectedAccDetails.account_code}</p>
              <p><strong>Name:</strong> {selectedAccDetails.account_name}</p>
              <p><strong>Type:</strong> {selectedAccDetails.account_type}</p>
              <p><strong>Usage Count:</strong> {selectedAccDetails.usage} journals</p>
              <p><strong>Last Used:</strong> {selectedAccDetails.lastDate || 'Never'}</p>
            </div>
            <div className="flex justify-end pt-4">
              <button className="px-4 py-2 border rounded" onClick={() => setSelectedAccDetails(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
