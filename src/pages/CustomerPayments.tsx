import toast from 'react-hot-toast';
// @ts-nocheck
import React, { useState, useMemo, useEffect } from 'react';
import type { CustomerPayment } from '../types';
import { useCustomerPayments, useCashBankAccounts, useCustomerInvoices } from '../hooks/useFinance';
import { getDataProvider } from '../providers';
import { supabase } from '../lib/supabase';

export default function CustomerPayments() {
  const { data: payments, refetch: refetchPayments } = useCustomerPayments();
  const { data: invoices, refetch: refetchInvoices } = useCustomerInvoices();
  const { data: accounts } = useCashBankAccounts();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<CustomerPayment | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);

  useEffect(() => {
    getDataProvider().getRepository('customers').list()
      .then(setCustomers)
      .catch(e => console.warn('failed to load customers', e));
  }, []);

  const [formData, setFormData] = useState({
    customer_id: '',
    project_id: '',
    payment_date: new Date().toISOString().split('T')[0],
    cash_bank_account_id: '',
    amount: 0,
    reference: ''
  });

  const [allocationInputs, setAllocationInputs] = useState<{ invoice_id: string, amount: number, invNumber: string, due_date: string, out: number }[]>([]);

  const activeAccounts = accounts.filter(a => a.active);

  const handleCustomerChange = (customer_id: string) => {
    setFormData({ ...formData, customer_id });
  };

  useEffect(() => {
    console.log('CustomerPayments useEffect running. customer_id:', formData.customer_id, 'invoices:', invoices);
    if (formData.customer_id) {
      const outs = invoices.filter(i => i.customer_id === formData.customer_id && i.outstanding_amount > 0);
      console.log('outs:', outs);
      setAllocationInputs(outs.map(i => ({ 
        invoice_id: i.id, 
        amount: 0,
        invNumber: i.invoice_number,
        due_date: i.due_date,
        out: i.outstanding_amount
      })));
    } else {
      setAllocationInputs([]);
    }
  }, [formData.customer_id, invoices]);

  const totalAllocated = useMemo(() => allocationInputs.reduce((sum, a) => sum + a.amount, 0), [allocationInputs]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (totalAllocated > formData.amount) {
      toast.error('Total allocated amount cannot exceed total payment amount.');
      return;
    }
    
    const allocations = allocationInputs.filter(a => a.amount > 0);
    if (allocations.length === 0) {
      toast.error('Tolong alokasikan pembayaran ke setidaknya satu faktur.');
      return;
    }

    try {
      const provider = getDataProvider();
      const selectedCustomer = customers.find(c => c.id === formData.customer_id);
      
      for (const allocation of allocations) {
        await provider.getCustomerPaymentRepository().createPayment({
          organization_id: selectedCustomer?.organization_id, // Will be overridden by auth profile in a real scenario
          customer_id: formData.customer_id,
          customer_invoice_id: allocation.invoice_id,
          cash_bank_account_id: formData.cash_bank_account_id,
          payment_number: `PAY-${Date.now()}-${Math.floor(Math.random()*100)}`,
          payment_date: formData.payment_date,
          amount: allocation.amount,
          reference: formData.reference,
          notes: `Payment for invoice ${allocation.invNumber}`
        });
      }

      setIsModalOpen(false);
      refetchPayments();
      refetchInvoices();
      toast.success('Payment received and posted successfully!');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const formatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customer Payments</h1>
          <p className="text-slate-500 mt-1">Record payments received from customers and apply to invoices.</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 border rounded" onClick={() => {
            setFormData({ customer_id: '', project_id: '', payment_date: new Date().toISOString().split('T')[0], cash_bank_account_id: '', amount: 0, reference: '' });
            setAllocationInputs([]);
            setIsModalOpen(true);
          }}>Receive Payment</button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Payment No</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Cash/Bank</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Amount</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Unapplied</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">Status</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {payments.map(pay => {
              const cb = accounts.find(a => a.id === pay.cash_bank_account_id)?.account_name;
              return (
                <tr key={pay.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-medium">{pay.payment_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{pay.payment_date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{pay.customer_name || customers.find(c => c.id === pay.customer_id)?.name || customers.find(c => c.id === pay.customer_id)?.customer_name || pay.customer_id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{cb || pay.cash_bank_account_id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-slate-900">{formatter.format(pay.amount)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-yellow-600 font-bold">{formatter.format(pay.unapplied_amount)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${pay.unapplied_amount === 0 ? 'bg-slate-100 text-slate-800' : 'bg-green-100 text-green-800'}`}>
                      {pay.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    <button className="px-4 py-2 border rounded" onClick={() => {
                      setSelectedPayment(pay);
                      setIsDetailModalOpen(true);
                    }}>View Details</button>
                  </td>
                </tr>
              );
            })}
            {payments.length === 0 && (
              <tr><td colSpan={8} className="px-6 py-4 text-center text-sm text-slate-500">No customer payments found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Receive Payment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex flex-col items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-4xl max-h-[90vh] flex flex-col">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex-shrink-0">Receive Customer Payment</h2>
            
            <div className="flex-1 overflow-auto">
              <form id="payment-form" onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label>Customer</label>
                    <select className="w-full rounded border px-3 py-2" value={formData.customer_id} onChange={e => handleCustomerChange(e.target.value)} required>
                      <option value="">Select Customer</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name || c.customer_name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label>Date</label>
                    <input className="w-full rounded border px-3 py-2" type="date" value={formData.payment_date} onChange={e => setFormData({...formData, payment_date: e.target.value})} required />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label>Deposit To</label>
                    <select className="w-full h-10 rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" value={formData.cash_bank_account_id} onChange={e => setFormData({...formData, cash_bank_account_id: e.target.value})} required>
                      <option value="">Select Account</option>
                      {activeAccounts.map(a => <option key={a.id} value={a.id}>{a.account_name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label>Amount Received (Rp)</label>
                    <input className="w-full rounded border px-3 py-2" type="number" min="1" value={formData.amount} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} required />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label>Reference Number (Optional)</label>
                  <input className="w-full rounded border px-3 py-2" value={formData.reference} onChange={e => setFormData({...formData, reference: e.target.value})} placeholder="Transfer ref" />
                </div>

                {formData.customer_id && (
                  <div className="border border-slate-200 rounded-lg overflow-hidden mt-6">
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                      <h3 className="font-semibold text-slate-900">Allocate to Outstanding Invoices</h3>
                    </div>
                    {allocationInputs.length > 0 ? (
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Inv No</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Due Date</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Outstanding</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Allocation Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          {allocationInputs.map((alloc, idx) => (
                            <tr key={alloc.invoice_id}>
                              <td className="px-4 py-2 text-sm text-slate-900 font-medium">{alloc.invNumber}</td>
                              <td className="px-4 py-2 text-sm text-slate-500">{alloc.due_date}</td>
                              <td className="px-4 py-2 text-sm text-right text-red-600">{formatter.format(alloc.out)}</td>
                              <td className="px-4 py-2 text-sm">
                                <input className="w-full rounded border px-3 py-2 text-right w-full"
                                  type="number" 
                                  min="0" 
                                  max={alloc.out}
                                  value={alloc.amount} 
                                  onChange={e => {
                                    const newInputs = [...allocationInputs];
                                    newInputs[idx].amount = Number(e.target.value);
                                    setAllocationInputs(newInputs);
                                  }} 
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-slate-50 font-medium text-sm">
                          <tr>
                            <td colSpan={3} className="px-4 py-3 text-right text-slate-700">Total Allocated:</td>
                            <td className={`px-4 py-3 text-right ${totalAllocated > formData.amount ? 'text-red-600' : 'text-slate-900'}`}>
                              {formatter.format(totalAllocated)}
                            </td>
                          </tr>
                          <tr>
                            <td colSpan={3} className="px-4 py-3 text-right text-slate-700">Remaining Unapplied:</td>
                            <td className="px-4 py-3 text-right text-brand-600">
                              {formatter.format(Math.max(0, formData.amount - totalAllocated))}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    ) : (
                      <div className="p-4 text-center text-sm text-slate-500 bg-white">
                        No outstanding invoices for this customer.
                      </div>
                    )}
                  </div>
                )}
              </form>
            </div>
            
            <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 mt-6 flex-shrink-0">
              <button className="px-4 py-2 border rounded" type="button" onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button className="px-4 py-2 border rounded bg-brand-600 text-white" type="submit" form="payment-form">Save Payment</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {isDetailModalOpen && selectedPayment && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Payment Details</h2>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-3 gap-2">
                <span className="text-slate-500 font-medium">Payment No</span>
                <span className="col-span-2 text-slate-900 font-medium">{selectedPayment.payment_number}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-slate-500 font-medium">Customer</span>
                <span className="col-span-2 text-slate-900">{selectedPayment.customer_name}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-slate-500 font-medium">Date</span>
                <span className="col-span-2 text-slate-900">{selectedPayment.payment_date}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-slate-500 font-medium">Amount Received</span>
                <span className="col-span-2 text-slate-900 font-bold text-green-600">{formatter.format(selectedPayment.amount)}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-slate-500 font-medium">Unapplied Amount</span>
                <span className="col-span-2 text-slate-900 text-yellow-600">{formatter.format(selectedPayment.unapplied_amount)}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-slate-500 font-medium">Status</span>
                <span className="col-span-2 text-slate-900">{selectedPayment.status}</span>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-slate-100">
              <h3 className="font-semibold text-slate-900 mb-3">Linked Transactions</h3>
              {selectedPayment.journal_entry_id && (
                <div className="text-sm bg-slate-50 p-2 rounded flex justify-between border border-slate-200">
                  <span className="text-slate-600">Journal Entry</span>
                  <span className="font-mono text-xs">{selectedPayment.journal_entry_id}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-6 mt-6 border-t border-slate-100">
              <button className="px-4 py-2 border rounded" type="button" onClick={() => setIsDetailModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
