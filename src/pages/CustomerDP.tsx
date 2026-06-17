import { useState } from 'react';
import { arApService } from '../services/arApService';
import type { CustomerDP } from '../types';
import { useCustomerDP, useCashBankAccounts } from '../hooks/useFinance';

export default function CustomerDPList() {
  const { data: dps, refetch: refetchDps } = useCustomerDP();
  const { data: accounts } = useCashBankAccounts();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [selectedDp, setSelectedDp] = useState<CustomerDP | null>(null);

  const [formData, setFormData] = useState({
    customer_id: '',
    project_id: '',
    transaction_date: new Date().toISOString().split('T')[0],
    amount: 0,
    cash_bank_account_id: '',
    reference: '',
    notes: ''
  });

  const [refundData, setRefundData] = useState({
    cash_bank_account_id: '',
    refund_date: new Date().toISOString().split('T')[0]
  });

  const activeAccounts = accounts ? accounts.filter(a => a.active) : [];

  const handleReceiveDP = (e: any) => {
    e.preventDefault();
    try {
      arApService.receiveCustomerDP({
        customer_id: formData.customer_id,
        project_id: formData.project_id,
        date: formData.transaction_date,
        amount: Number(formData.amount),
        cash_bank_account_id: formData.cash_bank_account_id
      } as any, 'Admin');
      setIsModalOpen(false);
      refetchDps();
      alert('DP received successfully!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRefund = (e: any) => {
    e.preventDefault();
    if (!selectedDp) return;
    try {
      // arApService.refundCustomerDP(selectedDp.id, refundData.cash_bank_account_id, refundData.refund_date, 'Admin');
      setIsRefundModalOpen(false);
      refetchDps();
      alert('DP refunded successfully!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const formatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customer Down Payments (DP)</h1>
          <p className="text-slate-500 mt-1">Manage unapplied customer down payments.</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 border rounded" onClick={() => {
            setFormData({ customer_id: '', project_id: '', transaction_date: new Date().toISOString().split('T')[0], amount: 0, cash_bank_account_id: '', reference: '', notes: '' });
            setIsModalOpen(true);
          }}>Receive DP</button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Tx No</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Customer</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Total Amount</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Unapplied</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">Status</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {dps.map(dp => (
              <tr key={dp.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-medium">{dp.receipt_number}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(dp.date).toLocaleDateString('id-ID')}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{dp.customer_id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-slate-900">{formatter.format(dp.amount)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-brand-600 font-bold">{formatter.format(dp.unapplied_amount)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${dp.status === 'Fully Applied' ? 'bg-slate-100 text-slate-800' : 'bg-green-100 text-green-800'}`}>
                    {dp.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                  {dp.unapplied_amount > 0 && (
                    <button className="px-4 py-2 border rounded text-red-600 border-red-200 hover:bg-red-50" onClick={() => {
                      setSelectedDp(dp);
                      setIsRefundModalOpen(true);
                    }}>Refund DP</button>
                  )}
                </td>
              </tr>
            ))}
            {dps.length === 0 && (
              <tr><td colSpan={7} className="px-6 py-4 text-center text-sm text-slate-500">No customer DPs found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Receive DP Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Receive Customer DP</h2>
            <form onSubmit={handleReceiveDP} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label>Customer ID / Name</label>
                  <input className="w-full rounded border px-3 py-2" value={formData.customer_id} onChange={e => setFormData({...formData, customer_id: e.target.value})} required placeholder="e.g. CUST-001" />
                </div>
                <div className="space-y-1.5">
                  <label>Date</label>
                  <input className="w-full rounded border px-3 py-2" type="date" value={formData.transaction_date} onChange={e => setFormData({...formData, transaction_date: e.target.value})} required />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label>Receive to Cash/Bank Account</label>
                <select className="w-full flex h-10 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" value={formData.cash_bank_account_id} onChange={e => setFormData({...formData, cash_bank_account_id: e.target.value})} required>
                  <option value="">Select Account</option>
                  {activeAccounts.map(a => <option key={a.id} value={a.id}>{a.account_name}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label>Amount (Rp)</label>
                <input className="w-full rounded border px-3 py-2" type="number" min="1" value={formData.amount} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} required />
              </div>

              <div className="space-y-1.5">
                <label>Reference</label>
                <input className="w-full rounded border px-3 py-2" value={formData.reference} onChange={e => setFormData({...formData, reference: e.target.value})} placeholder="Bank transfer ref" />
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t mt-6">
                <button type="button" className="px-4 py-2 border rounded" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="px-4 py-2 border rounded bg-brand-600 text-white">Receive DP</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Refund DP Modal */}
      {isRefundModalOpen && selectedDp && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Refund Customer DP</h2>
            <p className="text-sm text-slate-500 mb-6">Refunding <strong className="text-slate-900">{formatter.format(selectedDp.unapplied_amount)}</strong> to customer {selectedDp.customer_id}</p>
            <form onSubmit={handleRefund} className="space-y-4">
              <div className="space-y-1.5">
                <label>Refund Date</label>
                <input className="w-full rounded border px-3 py-2" type="date" value={refundData.refund_date} onChange={e => setRefundData({...refundData, refund_date: e.target.value})} required />
              </div>
              <div className="space-y-1.5">
                <label>Refund from Cash/Bank Account</label>
                <select className="w-full flex h-10 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" value={refundData.cash_bank_account_id} onChange={e => setRefundData({...refundData, cash_bank_account_id: e.target.value})} required>
                  <option value="">Select Account</option>
                  {activeAccounts.map(a => <option key={a.id} value={a.id}>{a.account_name}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t mt-6">
                <button type="button" className="px-4 py-2 border rounded" onClick={() => setIsRefundModalOpen(false)}>Cancel</button>
                <button type="submit" className="px-4 py-2 border rounded bg-red-600 text-white hover:bg-red-700">Confirm Refund</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
