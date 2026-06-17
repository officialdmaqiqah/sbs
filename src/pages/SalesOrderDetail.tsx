import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, PackageCheck, Banknote, Truck } from 'lucide-react';
import { useSalesOrders } from '../hooks/useSalesOrders';
import { useInventoryBalances } from '../hooks/useInventoryBalances';
import { usePackageComponents } from '../hooks/usePackageComponents';
import { supabase } from '../lib/supabase';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { useCashBankAccounts } from '../hooks/useFinance';

export default function SalesOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: orders, loading, updateOrderStatus, markStockProcessed, markPaid } = useSalesOrders();
  const order = orders.find(o => o.id === id);
  
  const { data: inventoryBalances } = useInventoryBalances({ projectId: order?.project_id });
  
  // Assuming the first item is the main item (simple flow)
  const mainItem = order?.items?.[0];
  const isPackage = mainItem?.product?.itemType === 'PACKAGE' || mainItem?.product?.category === 'Paket Usaha';
  
  const { data: packageComponents } = usePackageComponents(isPackage ? mainItem?.product_id : undefined);
  const { data: cashBankAccounts } = useCashBankAccounts();

  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedCashBankId, setSelectedCashBankId] = useState('');

  const getStock = (itemId: string) => {
    return inventoryBalances?.find(b => b.item_id === itemId)?.quantity || 0;
  };

  const checkAvailability = () => {
    if (!order || !mainItem) return { isReady: false, missing: [] };
    const missing: string[] = [];
    const qty = mainItem.quantity;

    if (isPackage) {
      if (packageComponents.length === 0) return { isReady: false, missing: ['Master Paket belum memiliki komponen.'] };
      packageComponents.forEach(c => {
        const reqQty = (c.quantity || c.quantity_per_package || 0) * qty;
        const avlQty = getStock(c.item_id);
        if (avlQty < reqQty) missing.push(`Komponen ID ${c.item_id} kurang ${reqQty - avlQty}`);
      });
    } else {
      const avlQty = getStock(mainItem.product_id);
      if (avlQty < qty) missing.push(`Stok kurang ${qty - avlQty}`);
    }

    return { isReady: missing.length === 0, missing };
  };

  const handleConfirm = async () => {
    const { isReady, missing } = checkAvailability();
    if (!isReady) {
      if (!window.confirm(`STOK KURANG:\n${missing.join('\n')}\n\nTetap konfirmasi order (Override Admin)?`)) {
        return;
      }
    }
    setIsProcessing(true);
    try {
      await updateOrderStatus(order.id, 'Dikonfirmasi');
    } catch(e:any) {
      alert(e.message);
    }
    setIsProcessing(false);
  };

  const handleProsesBarangKeluar = async () => {
    if (order.stock_processed_at) {
      alert('Barang sudah diproses keluar!');
      return;
    }
    setIsProcessing(true);
    try {
      const movements = [];
      const qty = mainItem.quantity;

      if (isPackage) {
        for (const c of packageComponents) {
          const reqQty = (c.quantity || c.quantity_per_package || 0) * qty;
          movements.push({
            organization_id: order.organization_id,
            project_id: order.project_id,
            item_id: c.item_id,
            movement_type: 'Sales Delivery',
            direction: 'OUT',
            quantity: reqQty,
            reference_type: 'SALES_ORDER',
            reference_id: order.id,
            reference_number: order.so_number,
            notes: `Barang keluar untuk order paket ${order.so_number}`
          });
        }
      } else {
        movements.push({
          organization_id: order.organization_id,
          project_id: order.project_id,
          item_id: mainItem.product_id,
          movement_type: 'Sales Delivery',
          direction: 'OUT',
          quantity: qty,
          reference_type: 'SALES_ORDER',
          reference_id: order.id,
          reference_number: order.so_number,
          notes: `Barang keluar untuk order ${order.so_number}`
        });
      }

      const { error } = await supabase.from('inventory_movements').insert(movements);
      if (error) throw error;

      await markStockProcessed(order.id);
      await updateOrderStatus(order.id, 'Siap Dikirim');
      alert('Stok berhasil dipotong!');
    } catch(e:any) {
      alert(e.message);
    }
    setIsProcessing(false);
  };

  const executePembayaran = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsProcessing(true);
    try {
      if (order.payment_method === 'Tunai') {
        if (!selectedCashBankId) {
          throw new Error('Silakan pilih akun Kas/Bank terlebih dahulu');
        }
        const payload = {
          organization_id: order.organization_id,
          project_id: order.project_id,
          mutation_date: new Date().toISOString().split('T')[0],
          mutation_type: 'IN',
          to_cash_bank_id: selectedCashBankId,
          amount: order.total_amount,
          notes: `Pembayaran tunai SO ${order.so_number}`,
          reference_type: 'SALES_ORDER',
          reference_id: order.id,
          source_module: 'SALES'
        };
        const { error } = await supabase.from('cash_bank_mutations').insert([payload]);
        if (error) throw error;
      } else {
        const invPayload = {
          organization_id: order.organization_id,
          project_id: order.project_id,
          customer_id: order.customer_id,
          invoice_number: `INV-${order.so_number}`,
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 14*86400000).toISOString().split('T')[0],
          total_amount: order.total_amount,
          status: 'Unpaid'
        };
        const { error } = await supabase.from('customer_invoices').insert([invPayload]);
        if (error) throw error;
        alert('Piutang berhasil dicatat di Customer Invoices!');
      }

      await markPaid(order.id);
      if (order.status === 'Siap Dikirim') {
         await updateOrderStatus(order.id, 'Selesai');
      }
      setIsPaymentModalOpen(false);
    } catch(e:any) {
      alert(e.message);
    }
    setIsProcessing(false);
  };

  const handleCatatPembayaran = async () => {
    if (order.payment_method === 'Tunai') {
      setIsPaymentModalOpen(true);
    } else {
      await executePembayaran();
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Memuat order...</div>;
  if (!order) return <div className="p-8 text-center text-red-500">Order tidak ditemukan</div>;

  const { isReady, missing } = checkAvailability();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/sales/orders')} className="p-2 hover:bg-slate-100 rounded-full">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{order.so_number}</h2>
          <p className="text-sm text-slate-500">Detail Order Penjualan</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Informasi Utama</h3>
            <div className="grid grid-cols-2 gap-y-4">
              <div>
                <p className="text-sm text-slate-500">Tanggal Order</p>
                <p className="font-medium text-slate-900">{order.so_date}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Customer</p>
                <p className="font-medium text-slate-900">{order.customer?.name}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Metode Pembayaran</p>
                <p className="font-medium text-slate-900">{order.payment_method}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Tagihan</p>
                <p className="font-bold text-brand-600 text-lg">Rp {Number(order.total_amount).toLocaleString('id-ID')}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Item Pesanan</h3>
            <div className="border border-slate-200 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-slate-900">{mainItem?.product?.name}</h4>
                  <Badge variant="default" className="mt-1">{isPackage ? 'Paket Usaha' : 'Produk Retail'}</Badge>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500">{mainItem?.quantity} x Rp {Number(mainItem?.unit_price).toLocaleString('id-ID')}</p>
                  <p className="font-bold text-slate-900 mt-1">Rp {Number(mainItem?.total_price).toLocaleString('id-ID')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Status & Aksi</h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Status Order</span>
                <Badge variant={order.status === 'Draft' ? 'default' : order.status === 'Dikonfirmasi' ? 'warning' : 'success'}>
                  {order.status}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Status Stok</span>
                <Badge variant={order.stock_processed_at ? 'success' : 'warning'}>
                  {order.stock_processed_at ? 'Sudah Keluar' : 'Belum Diproses'}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Status Bayar</span>
                <Badge variant={order.payment_status === 'Lunas' ? 'success' : 'danger'}>
                  {order.payment_status}
                </Badge>
              </div>
            </div>

            <div className="mt-8 space-y-3">
              {order.status === 'Draft' && (
                <button disabled={isProcessing} onClick={handleConfirm} className="w-full bg-brand-600 text-white px-4 py-2 rounded-md font-medium flex items-center justify-center gap-2 hover:bg-brand-700 disabled:opacity-50">
                  <CheckCircle className="w-4 h-4" /> Konfirmasi Order
                </button>
              )}
              
              {(order.status === 'Dikonfirmasi' || order.status === 'Siap Dikirim') && !order.stock_processed_at && (
                <button disabled={isProcessing} onClick={handleProsesBarangKeluar} className="w-full bg-amber-600 text-white px-4 py-2 rounded-md font-medium flex items-center justify-center gap-2 hover:bg-amber-700 disabled:opacity-50">
                  <PackageCheck className="w-4 h-4" /> Proses Barang Keluar
                </button>
              )}

              {order.payment_status !== 'Lunas' && (order.status !== 'Draft') && (
                <button disabled={isProcessing} onClick={handleCatatPembayaran} className="w-full bg-green-600 text-white px-4 py-2 rounded-md font-medium flex items-center justify-center gap-2 hover:bg-green-700 disabled:opacity-50">
                  <Banknote className="w-4 h-4" /> Catat Pembayaran ({order.payment_method})
                </button>
              )}

              {order.stock_processed_at && (
                <div className="mt-4 p-4 border border-indigo-200 bg-indigo-50 rounded-lg text-center">
                  <Truck className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
                  <p className="text-sm text-indigo-800 font-medium">Order ini siap dibuat jadwal pengiriman di fase Distribusi.</p>
                </div>
              )}
            </div>

            {order.status === 'Draft' && !isReady && (
              <div className="mt-4 bg-red-50 p-3 rounded text-xs text-red-700 border border-red-200">
                <strong>Stok Tidak Mencukupi:</strong>
                <ul className="list-disc pl-4 mt-1">
                  {missing.map((m, i) => <li key={i}>{m}</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal isOpen={isPaymentModalOpen} onClose={() => !isProcessing && setIsPaymentModalOpen(false)} title="Konfirmasi Pembayaran">
        <form onSubmit={executePembayaran} className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
            <p className="text-sm text-slate-600 mb-1">Total yang harus dibayar:</p>
            <p className="text-xl font-bold text-brand-600">Rp {Number(order.total_amount).toLocaleString('id-ID')}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700">Pilih Akun Kas / Bank (Tujuan)</label>
            <select required value={selectedCashBankId} onChange={e => setSelectedCashBankId(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2">
              <option value="">-- Pilih Rekening Penerima --</option>
              {cashBankAccounts?.map(account => (
                <option key={account.id} value={account.id}>{account.bank_name} - {account.account_name}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end pt-4 gap-2">
            <button type="button" onClick={() => setIsPaymentModalOpen(false)} disabled={isProcessing} className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50">
              Batal
            </button>
            <button type="submit" disabled={isProcessing} className="bg-green-600 text-white px-4 py-2 rounded-md font-medium hover:bg-green-700 disabled:opacity-50">
              {isProcessing ? 'Memproses...' : 'Simpan Pembayaran'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
