 import {  useState  } from 'react';
import { arApService } from '../services/arApService';
import { useCustomerRefunds, useCashBankAccounts } from '../hooks/useFinance';

export default function CustomerRefunds() {
  const { data: refunds, refetch: refetchRefunds } = useCustomerRefunds();
  const { data: accounts } = useCashBankAccounts();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    customer_id: '',
    return_id: '',
    project_id: '',
    date: new Date().toISOString().split('T')[0],
    cash_bank_account_id: '',
    amount: 0,
    reason: ''
  });

  const activeAccounts = accounts.filter(a => a.active);

  const handleSubmit = (e: any) => {
    e.preventDefault();
    try {
      arApService.issueCustomerRefund(formData, 'Admin');
      setIsModalOpen(false);
      refetchRefunds();
      alert('Refund issued and posted successfully!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const formatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customer Refunds</h1>
          <p className="text-slate-500 mt-1">Issue refunds to customers for sales returns.</p>
        </div>
        <button className="px-4 py-2 border rounded" onClick={() => {
          setFormData({ customer_id: '', return_id: '', project_id: '', date: new Date().toISOString().split('T')[0], cash_bank_account_id: '', amount: 0, reason: '' });
          setIsModalOpen(true);
        }}>Issue Refund</button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Refund No</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Return Ref</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Cash/Bank</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Amount</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {refunds.map(ref => {
              const cb = accounts.find(a => a.id === ref.cash_bank_account_id)?.account_name;
              return (
                <tr key={ref.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-medium">{ref.refund_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{ref.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{ref.customer_id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{ref.return_id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{cb || ref.cash_bank_account_id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-slate-900">{formatter.format(ref.amount)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${ref.status === 'Posted' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {ref.status}
                    </span>
                  </td>
                </tr>
              );
            })}
            {refunds.length === 0 && (
              <tr><td colSpan={7} className="px-6 py-4 text-center text-sm text-slate-500">No refunds found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Issue Customer Refund</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label>Customer ID / Name</label>
                  <input className="w-full rounded border px-3 py-2" value={formData.customer_id} onChange={e => setFormData({...formData, customer_id: e.target.value})} required placeholder="e.g. CUST-001" />
                </div>
                <div className="space-y-1.5">
                  <label>Date</label>
                  <input className="w-full rounded border px-3 py-2" type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label>Pay From</label>
                  <select className="w-full h-10 rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" value={formData.cash_bank_account_id} onChange={e => setFormData({...formData, cash_bank_account_id: e.target.value})} required>
                    <option value="">Select Account</option>
                    {activeAccounts.map(a => <option key={a.id} value={a.id}>{a.account_name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label>Amount (Rp)</label>
                  <input className="w-full rounded border px-3 py-2" type="number" min="1" value={formData.amount} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} required />
                </div>
              </div>
              <div className="space-y-1.5">
                <label>Return Reference (Optional)</label>
                <input className="w-full rounded border px-3 py-2" value={formData.return_id} onChange={e => setFormData({...formData, return_id: e.target.value})} placeholder="e.g. RET-001" />
              </div>
              <div className="space-y-1.5">
                <label>Reason</label>
                <input className="w-full rounded border px-3 py-2" value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} placeholder="Reason for refund" />
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t mt-6">
                <button type="button" className="px-4 py-2 border rounded" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="px-4 py-2 border rounded bg-brand-600 text-white">Issue Refund</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
