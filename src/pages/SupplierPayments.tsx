import React, { useState } from 'react';
import { usePayableSupplierBills, useSupplierPayments, useCreateSupplierPayment } from '../hooks/useSupplierPayments';
import { useAuth } from '../contexts/AuthContext';
import { useCashBankAccounts } from '../hooks/useFinance';
import { CurrencyInput } from '../components/ui/CurrencyInput';

export function SupplierPayments() {
  const { profile, user } = useAuth();
  const { data: payableBills, loading: billsLoading, refetch: refetchBills } = usePayableSupplierBills();
  const { data: payments, loading: paymentsLoading, refetch: refetchPayments } = useSupplierPayments();
  const { data: accounts } = useCashBankAccounts();
  const { createPayment, loading: creating } = useCreateSupplierPayment();
  
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    cash_bank_account_id: '',
    payment_number: '',
    payment_date: new Date().toISOString().split('T')[0],
    amount: '',
    reference: ''
  });

  const handleOpenModal = (bill: any) => {
    setSelectedBill(bill);
    setSubmitError(null);
    setFormData({
      cash_bank_account_id: '',
      payment_number: '',
      payment_date: new Date().toISOString().split('T')[0],
      amount: String(bill.outstanding_amount),
      reference: ''
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedBill(null);
    setSubmitError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!profile?.organization_id) {
      setSubmitError('Organization ID not found');
      return;
    }
    
    try {
      await createPayment({
        organization_id: profile.organization_id,
        supplier_bill_id: selectedBill.id,
        cash_bank_account_id: formData.cash_bank_account_id,
        payment_number: formData.payment_number,
        payment_date: formData.payment_date,
        amount: Number(formData.amount),
        reference: formData.reference,
        created_by: user!.id
      } as any);
      
      handleCloseModal();
      refetchBills();
      refetchPayments();
    } catch (err: any) {
      setSubmitError(err.message);
    }
  };

  if (billsLoading || paymentsLoading) return <div className="p-4">Loading...</div>;

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Pembayaran Supplier</h1>

      {profile?.role === 'CEO_ADMIN' || profile?.role === 'FINANCE' ? (
        <>
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Tagihan Siap Bayar</h2>
            <div className="overflow-x-auto bg-white rounded-lg shadow">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No. Tagihan</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jatuh Tempo</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Sisa Tagihan</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payableBills.length === 0 ? (
                    <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">Tidak ada tagihan siap bayar</td></tr>
                  ) : payableBills.map(bill => (
                    <tr key={bill.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{bill.bill_number}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{bill.supplier_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{bill.due_date}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">Rp {Number(bill.outstanding_amount).toLocaleString('id-ID')}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${bill.status === 'Open' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {bill.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <button onClick={() => handleOpenModal(bill)} className="text-blue-600 hover:text-blue-900 font-medium">Buat Pembayaran</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Riwayat Pembayaran</h2>
            <div className="overflow-x-auto bg-white rounded-lg shadow">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No. Pembayaran</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Jumlah</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payments.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">Belum ada riwayat pembayaran</td></tr>
                  ) : payments.map((payment: any) => (
                    <tr key={payment.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{payment.payment_number}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{payment.payment_date}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{payment.supplier_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">Rp {Number(payment.total_amount).toLocaleString('id-ID')}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {payment.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {isModalOpen && selectedBill && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
                <div className="mt-3">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Bayar Tagihan {selectedBill.bill_number}</h3>
                  <div className="mb-4 text-sm text-gray-600">
                    <p>Sisa Tagihan: Rp {Number(selectedBill.outstanding_amount).toLocaleString('id-ID')}</p>
                  </div>
                  <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                      <label className="block text-gray-700 text-sm font-bold mb-2">Akun Kas/Bank</label>
                      <select 
                        required
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700"
                        value={formData.cash_bank_account_id}
                        onChange={e => setFormData({...formData, cash_bank_account_id: e.target.value})}
                      >
                        <option value="">Pilih Akun Kas/Bank</option>
                        {accounts?.map((acc: any) => (
                          <option key={acc.id} value={acc.id}>{acc.name} - Rp {Number(acc.balance).toLocaleString('id-ID')}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-gray-700 text-sm font-bold mb-2">Nomor Pembayaran</label>
                      <input type="text" name="payment_number" required className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700" value={formData.payment_number} onChange={e => setFormData({...formData, payment_number: e.target.value})} />
                    </div>

                    <div className="mb-4">
                      <label className="block text-gray-700 text-sm font-bold mb-2">Tanggal</label>
                      <input type="date" required className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700" value={formData.payment_date} onChange={e => setFormData({...formData, payment_date: e.target.value})} />
                    </div>

                    <div className="mb-4">
                      <label className="block text-gray-700 text-sm font-bold mb-2">Jumlah Bayar (Rp)</label>
                      <CurrencyInput  required max={selectedBill.outstanding_amount} min={1} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700" value={formData.amount} onChange={(val) => setFormData({...formData, amount: val})} />
                    </div>

                    <div className="mb-4">
                      <label className="block text-gray-700 text-sm font-bold mb-2">Referensi (Opsional)</label>
                      <input type="text" className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700" value={formData.reference} onChange={e => setFormData({...formData, reference: e.target.value})} />
                    </div>

                    <div className="mb-4 p-3 bg-blue-50 text-blue-800 text-sm rounded">
                      <p className="font-semibold mb-1">Pratinjau Jurnal: Debit AP, Kredit Kas/Bank</p>
                      <p>Jurnal akan otomatis dibuat saat pembayaran diproses.</p>
                    </div>

                    {submitError && (
                      <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
                        {submitError}
                      </div>
                    )}

                    <div className="flex justify-end mt-6">
                      <button type="button" onClick={handleCloseModal} className="bg-gray-200 text-gray-800 px-4 py-2 rounded mr-2 hover:bg-gray-300">Batal</button>
                      <button type="submit" disabled={creating} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50">
                        {creating ? 'Memproses...' : 'Proses Pembayaran'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-red-50 text-red-800 p-4 rounded-lg">
          Anda tidak memiliki akses ke halaman ini.
        </div>
      )}
    </div>
  );
}

export default SupplierPayments;
