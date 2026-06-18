import React, { useState, useEffect } from 'react';
import { useSupplierBills } from '../hooks/useSupplierBills';
import type { SupplierBill } from '../types';
import type { BillEligibleReceipt } from '../providers/interfaces/SupplierBillReadService';
import { useAuth } from '../contexts/AuthContext';
import { FileText, Plus, AlertCircle, CheckCircle } from 'lucide-react';

const formatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' });

export default function SupplierBills() {
  const { user } = useAuth();
  const { 
    bills, 
    billEligibleReceipts, 
    loading, 
    error, 
    fetchBills, 
    fetchBillEligibleReceipts, 
    createBillFromReceipt,
    getBillLines
  } = useSupplierBills();

  const [activeTab, setActiveTab] = useState<'eligible' | 'bills'>('eligible');
  const [selectedReceipt, setSelectedReceipt] = useState<BillEligibleReceipt | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<SupplierBill | null>(null);
  const [billLines, setBillLines] = useState<any[]>([]);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    bill_number: '',
    bill_date: new Date().toISOString().split('T')[0],
    due_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    fetchBillEligibleReceipts();
    fetchBills();
  }, [fetchBillEligibleReceipts, fetchBills]);

  useEffect(() => {
    console.log('SupplierBills component mounted or updated');
    console.log('billEligibleReceipts:', billEligibleReceipts);
    if (error) console.error('SupplierBills error:', error);
  }, [billEligibleReceipts, error]);

  const handleCreateBillClick = (receipt: BillEligibleReceipt) => {
    console.log('[BROWSER] onClick Buat Tagihan for receipt:', receipt.id);
    setSelectedReceipt(receipt);
    setFormData({
      bill_number: `BILL-${receipt.receipt_number}`,
      bill_date: new Date().toISOString().split('T')[0],
      due_date: new Date().toISOString().split('T')[0],
      notes: `Tagihan untuk penerimaan ${receipt.receipt_number}`
    });
    
    // Auto-fetch lines if needed or just rely on the existing items data
    // In Phase 3B, lines will be pulled from purchase_receipt_items later in the modal if necessary
    
    setIsNewModalOpen(true);
    console.log('[BROWSER] isNewModalOpen set to true');
  };

  const handleSubmitBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReceipt || !user) return;
    
    try {
      await createBillFromReceipt({
        purchase_receipt_id: selectedReceipt.id,
        bill_number: formData.bill_number,
        bill_date: formData.bill_date,
        due_date: formData.due_date,
        supplier_id: selectedReceipt.supplier_id,
        project_id: selectedReceipt.project_id,
        notes: formData.notes,
        created_by: user.id
      });
      setIsNewModalOpen(false);
      setSelectedReceipt(null);
      // Switch tab to see the new bill
      setActiveTab('bills');
    } catch (err: any) {
      alert(err.message || 'Gagal membuat tagihan');
    }
  };

  const handleOpenDetail = async (bill: SupplierBill) => {
    setSelectedBill(bill);
    try {
      const lines = await getBillLines(bill.id);
      setBillLines(lines);
      setIsDetailModalOpen(true);
    } catch (err) {
      console.error(err);
      alert('Gagal mengambil detail baris tagihan');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Supplier Bills</h1>
          <p className="mt-1 text-sm text-slate-500">Kelola tagihan dari supplier berdasarkan penerimaan barang.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('eligible')}
            className={`${
              activeTab === 'eligible'
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            Bill Eligible Receipts
            <span className="ml-2 bg-slate-100 text-slate-600 py-0.5 px-2.5 rounded-full text-xs">
              {billEligibleReceipts.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('bills')}
            className={`${
              activeTab === 'bills'
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            Daftar Tagihan
            <span className="ml-2 bg-slate-100 text-slate-600 py-0.5 px-2.5 rounded-full text-xs">
              {bills.length}
            </span>
          </button>
        </nav>
      </div>

      {loading && <div className="text-sm text-slate-500">Loading data...</div>}

      {/* Eligible Receipts Tab */}
      {activeTab === 'eligible' && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Receipt No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">PO No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Supplier</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Project</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Total Estimasi</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {billEligibleReceipts.map(receipt => (
                <tr key={receipt.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-medium">{receipt.receipt_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{receipt.po_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{receipt.supplier_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{receipt.project_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-slate-900">
                    {formatter.format(receipt.total_amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    <button 
                      onClick={() => handleCreateBillClick(receipt)}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-brand-600 hover:bg-brand-700"
                    >
                      <Plus className="w-4 h-4 mr-1" /> Buat Tagihan
                    </button>
                  </td>
                </tr>
              ))}
              {billEligibleReceipts.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <CheckCircle className="mx-auto h-12 w-12 text-green-400" />
                    <h3 className="mt-2 text-sm font-medium text-slate-900">Semua penerimaan sudah ditagihkan</h3>
                    <p className="mt-1 text-sm text-slate-500">Tidak ada receipt yang berstatus Bill Eligible.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Supplier Bills Tab */}
      {activeTab === 'bills' && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Bill No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Total Amount</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Outstanding</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">Status</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {bills.map(bill => (
                <tr key={bill.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-medium">{bill.bill_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    <div>{bill.bill_date}</div>
                    <div className="text-xs text-red-500">Due: {bill.due_date}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-slate-900">
                    {formatter.format(bill.total_amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600 font-bold">
                    {formatter.format(bill.outstanding_amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {bill.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    <button 
                      onClick={() => handleOpenDetail(bill)}
                      className="text-brand-600 hover:text-brand-900"
                    >
                      <FileText className="w-5 h-5 mx-auto" />
                    </button>
                  </td>
                </tr>
              ))}
              {bills.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-500">
                    Belum ada tagihan supplier yang dibuat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Create Bill */}
      {isNewModalOpen && selectedReceipt && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-slate-500 bg-opacity-75" onClick={() => setIsNewModalOpen(false)} />
            <div className="relative inline-block w-full max-w-lg p-6 overflow-hidden text-left align-middle transition-all transform bg-white rounded-lg shadow-xl sm:my-8">
              <h3 className="text-lg font-medium leading-6 text-slate-900 mb-4">
                Buat Tagihan (Supplier Bill)
              </h3>
              <form onSubmit={handleSubmitBill} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Receipt Source</label>
                  <input type="text" disabled value={selectedReceipt.receipt_number} className="mt-1 block w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-md shadow-sm text-slate-700 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Total Tagihan (Estimasi PO)</label>
                  <input type="text" disabled value={formatter.format(selectedReceipt.total_amount)} className="mt-1 block w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-md shadow-sm font-bold text-slate-900 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Nomor Invoice Supplier <span className="text-red-500">*</span></label>
                  <input type="text" name="bill_number" required value={formData.bill_number} onChange={e => setFormData({...formData, bill_number: e.target.value})} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Tanggal Tagihan <span className="text-red-500">*</span></label>
                    <input type="date" required value={formData.bill_date} onChange={e => setFormData({...formData, bill_date: e.target.value})} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Jatuh Tempo <span className="text-red-500">*</span></label>
                    <input type="date" required value={formData.due_date} onChange={e => setFormData({...formData, due_date: e.target.value})} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Catatan</label>
                  <textarea rows={3} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm" />
                </div>
                
                <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse">
                  <button type="submit" disabled={loading} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-brand-600 text-base font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50">
                    {loading ? 'Menyimpan...' : 'Simpan Tagihan'}
                  </button>
                  <button type="button" onClick={() => setIsNewModalOpen(false)} className="mt-3 w-full inline-flex justify-center rounded-md border border-slate-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 sm:mt-0 sm:w-auto sm:text-sm">
                    Batal
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {isDetailModalOpen && selectedBill && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-slate-500 bg-opacity-75" onClick={() => setIsDetailModalOpen(false)} />
            <div className="relative inline-block w-full max-w-2xl p-6 overflow-hidden text-left align-middle transition-all transform bg-white rounded-lg shadow-xl sm:my-8">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-slate-900">Tagihan #{selectedBill.bill_number}</h3>
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                  {selectedBill.status}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-slate-500">Tanggal Tagihan</p>
                  <p className="font-medium text-slate-900">{selectedBill.bill_date}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Jatuh Tempo</p>
                  <p className="font-medium text-slate-900">{selectedBill.due_date}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total Tagihan</p>
                  <p className="font-bold text-slate-900">{formatter.format(selectedBill.total_amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Sisa Tagihan (Outstanding)</p>
                  <p className="font-bold text-red-600">{formatter.format(selectedBill.outstanding_amount)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-slate-500">Catatan</p>
                  <p className="text-slate-900">{selectedBill.notes || '-'}</p>
                </div>
              </div>

              <h4 className="text-sm font-semibold text-slate-900 mb-2">Item Tagihan</h4>
              <div className="border border-slate-200 rounded-md overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Item</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-slate-500">Qty</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-slate-500">Harga Satuan</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-slate-500">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {billLines.map(line => (
                      <tr key={line.id}>
                        <td className="px-4 py-2 text-sm text-slate-900">{line.items?.name || 'Unknown Item'}</td>
                        <td className="px-4 py-2 text-sm text-right text-slate-900">{line.quantity}</td>
                        <td className="px-4 py-2 text-sm text-right text-slate-900">{formatter.format(line.unit_cost)}</td>
                        <td className="px-4 py-2 text-sm text-right font-medium text-slate-900">{formatter.format(line.total_price)}</td>
                      </tr>
                    ))}
                    {billLines.length === 0 && (
                      <tr><td colSpan={4} className="px-4 py-2 text-center text-sm text-slate-500">Belum ada item ditarik</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 sm:flex sm:flex-row-reverse">
                <button type="button" onClick={() => setIsDetailModalOpen(false)} className="w-full inline-flex justify-center rounded-md border border-slate-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 sm:w-auto sm:text-sm">
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
