// @ts-nocheck
import { useState, useMemo, useEffect } from 'react';
import { arApService } from '../services/arApService';
import type { CustomerInvoice, Project } from '../types';
import { useCustomerInvoices, useCustomerDP } from '../hooks/useFinance';
import { db } from '../services/db';
import { getDataProvider } from '../providers';
import toast from 'react-hot-toast';

export default function CustomerInvoices() {
  const { data: invoices, refetch: refetchInvoices } = useCustomerInvoices();
  const { data: dps, refetch: refetchDps } = useCustomerDP();
  const [projects, setProjects] = useState<Project[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);

  const [selectedInvoice, setSelectedInvoice] = useState<CustomerInvoice | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isApplyDpModalOpen, setIsApplyDpModalOpen] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  
  const [selectedDpId, setSelectedDpId] = useState('');
  const [applyDpAmount, setApplyDpAmount] = useState(0);

  const [formData, setFormData] = useState({
    customer_id: '',
    project_id: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date().toISOString().split('T')[0],
    total_amount: 0,
    tax_amount: 0
  });

  useEffect(() => {
    const loadData = async () => {
      const provider = getDataProvider();
      try {
        const projs = await provider.getProjectRepository().listProjects();
        setProjects(projs);
      } catch(e) { console.warn('failed to load projects', e); }
      try {
        const custs = await provider.getRepository('customers').list();
        setCustomers(custs);
      } catch(e) { console.warn('failed to load customers', e); }
    };
    loadData();
  }, []);

  const availableDps = useMemo(() => {
    if (!selectedInvoice) return [];
    return dps.filter(dp => dp.customer_id === selectedInvoice.customer_id && dp.unapplied_amount > 0);
  }, [selectedInvoice, dps]);

  const handleApplyDp = (e: any) => {
    e.preventDefault();
    if (!selectedInvoice || !selectedDpId || applyDpAmount <= 0) return;
    try {
      arApService.applyCustomerDP(selectedDpId, selectedInvoice.id, applyDpAmount, 'Admin');
      setIsApplyDpModalOpen(false);
      setIsDetailModalOpen(false);
      refetchInvoices();
      refetchDps();
      toast.success('DP applied successfully!');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleCreateInvoice = async (e: any) => {
    e.preventDefault();
    try {
      const provider = getDataProvider();
      const selectedCustomer = customers.find(c => c.id === formData.customer_id);
      const payload = {
        organization_id: selectedCustomer?.organization_id,
        customer_id: formData.customer_id,
        project_id: formData.project_id || null,
        invoice_number: `INV-${Date.now()}`,
        invoice_date: formData.invoice_date,
        due_date: formData.due_date,
        total_amount: formData.total_amount,
        paid_amount: 0,
        status: 'Open'
      };
      console.log('SENDING PAYLOAD:', payload);
      await provider.getCustomerInvoiceRepository().createInvoice(payload);

      setIsNewModalOpen(false);
      refetchInvoices();
      toast.success('Invoice created successfully! Note: Penambahan line item secara manual belum tersedia di Internal Beta.');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const openDetail = (inv: CustomerInvoice) => {
    setSelectedInvoice(inv);
    setIsDetailModalOpen(true);
  };

  const formatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customer Invoices (AR)</h1>
          <p className="text-slate-500 mt-1">Manage receivables from customers.</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 border rounded" onClick={() => {
            setFormData({ customer_id: '', project_id: '', invoice_date: new Date().toISOString().split('T')[0], due_date: new Date().toISOString().split('T')[0], total_amount: 0, tax_amount: 0 });
            setIsNewModalOpen(true);
          }}>Create Invoice</button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Inv No</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Project</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Total Amount</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Paid / DP</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Outstanding</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">Status</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {invoices.map(inv => {
              const proj = projects.find(p => p.id === inv.project_id)?.name || inv.project_id;
              const cust = customers.find(c => c.id === inv.customer_id);
              const custName = cust ? (cust.name || cust.customer_name) : inv.customer_id;
              return (
                <tr key={inv.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-medium">{inv.invoice_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{custName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{proj}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    <div>{inv.invoice_date}</div>
                    <div className="text-xs text-red-500">Due: {inv.due_date}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-slate-900">{formatter.format(inv.total_amount)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 font-medium">{formatter.format(inv.paid_amount + inv.dp_applied)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600 font-bold">{formatter.format(inv.outstanding_amount)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${inv.status === 'Paid' ? 'bg-green-100 text-green-800' : inv.status === 'Overdue' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    <button className="px-4 py-2 border rounded" onClick={() => openDetail(inv)}>Detail</button>
                  </td>
                </tr>
              );
            })}
            {invoices.length === 0 && (
              <tr><td colSpan={9} className="px-6 py-4 text-center text-sm text-slate-500">No invoices found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* New Invoice Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Create Manual Invoice</h2>
            <form onSubmit={handleCreateInvoice} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label>Customer</label>
                  <select className="w-full flex h-10 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" value={formData.customer_id} onChange={e => setFormData({...formData, customer_id: e.target.value})} required>
                    <option value="">Select Customer</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name || c.customer_name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label>Project (Optional)</label>
                  <select className="w-full flex h-10 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" value={formData.project_id} onChange={e => setFormData({...formData, project_id: e.target.value})}>
                    <option value="">No Project</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{(p as any).project_name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label>Invoice Date</label>
                  <input className="w-full rounded border px-3 py-2" type="date" value={formData.invoice_date} onChange={e => setFormData({...formData, invoice_date: e.target.value})} required />
                </div>
                <div className="space-y-1.5">
                  <label>Due Date</label>
                  <input className="w-full rounded border px-3 py-2" type="date" value={formData.due_date} onChange={e => setFormData({...formData, due_date: e.target.value})} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label>Total Amount (Rp)</label>
                  <input className="w-full rounded border px-3 py-2" type="number" min="1" value={formData.total_amount} onChange={e => setFormData({...formData, total_amount: Number(e.target.value)})} required />
                </div>
                <div className="space-y-1.5">
                  <label>Tax Amount (Included)</label>
                  <input className="w-full rounded border px-3 py-2" type="number" min="0" value={formData.tax_amount} onChange={e => setFormData({...formData, tax_amount: Number(e.target.value)})} required />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t mt-6">
                <button type="button" className="px-4 py-2 border rounded" onClick={() => setIsNewModalOpen(false)}>Cancel</button>
                <button className="px-4 py-2 border rounded bg-brand-600 text-white" type="submit">Create Invoice</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {isDetailModalOpen && selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Invoice Details</h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div><span className="text-slate-500 text-sm">Invoice No:</span> <span className="font-medium">{selectedInvoice.invoice_number}</span></div>
              <div><span className="text-slate-500 text-sm">Customer:</span> <span className="font-medium">{selectedInvoice.customer_id}</span></div>
              <div><span className="text-slate-500 text-sm">Status:</span> <span className="font-medium">{selectedInvoice.status}</span></div>
              <div><span className="text-slate-500 text-sm">Outstanding:</span> <span className="font-bold text-red-600">{formatter.format(selectedInvoice.outstanding_amount)}</span></div>
            </div>
            
            {/* Invoice Lines */}
            <h3 className="font-semibold text-slate-900 mt-6 mb-2">Invoice Lines</h3>
            <table className="w-full text-sm mb-6 border border-slate-200">
              <thead className="bg-slate-50">
                <tr><th className="p-2 text-left">Item</th><th className="p-2 text-right">Qty</th><th className="p-2 text-right">Price</th><th className="p-2 text-right">Total</th></tr>
              </thead>
              <tbody>
                {(selectedInvoice as any).lines ? (selectedInvoice as any).lines.map((l: any, i: number) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="p-2">{l.description}</td>
                    <td className="p-2 text-right">{l.quantity}</td>
                    <td className="p-2 text-right">{formatter.format(l.unit_price)}</td>
                    <td className="p-2 text-right">{formatter.format(l.total_price)}</td>
                  </tr>
                )) : <tr><td colSpan={4} className="p-2 text-center text-slate-500">No line items</td></tr>}
              </tbody>
            </table>

            {/* Apply DP Button */}
            {selectedInvoice.outstanding_amount > 0 && availableDps.length > 0 && (
              <div className="mb-6 pt-4 border-t border-slate-200">
                <button className="px-4 py-2 border border-brand-200 bg-brand-50 text-brand-700 rounded w-full font-medium" onClick={() => setIsApplyDpModalOpen(true)}>
                  Apply Customer DP
                </button>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t">
              <button className="px-4 py-2 border rounded" onClick={() => setIsDetailModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Apply DP Modal */}
      {isApplyDpModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Apply Customer DP</h2>
            <form onSubmit={handleApplyDp} className="space-y-4">
              <div className="space-y-1.5">
                <label>Select DP</label>
                <select className="w-full rounded border px-3 py-2" value={selectedDpId} onChange={e => {
                  setSelectedDpId(e.target.value);
                  const dp = availableDps.find(d => d.id === e.target.value);
                  if (dp && selectedInvoice) {
                    setApplyDpAmount(Math.min(dp.unapplied_amount, selectedInvoice.outstanding_amount));
                  }
                }} required>
                  <option value="">Select DP Transaction</option>
                  {availableDps.map(dp => (
                    <option key={dp.id} value={dp.id}>{dp.receipt_number} (Avail: {formatter.format(dp.unapplied_amount)})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label>Amount to Apply</label>
                <input className="w-full rounded border px-3 py-2" type="number" min="1" max={selectedInvoice?.outstanding_amount || 0} value={applyDpAmount} onChange={e => setApplyDpAmount(Number(e.target.value))} required />
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t mt-6">
                <button type="button" className="px-4 py-2 border rounded" onClick={() => setIsApplyDpModalOpen(false)}>Cancel</button>
                <button className="px-4 py-2 border rounded bg-brand-600 text-white" type="submit">Apply DP</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
