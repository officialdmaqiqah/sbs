import { useState } from 'react';
import { useSalesDeliveries, useDeliverableSalesOrders, useCreateSalesDelivery } from '../hooks/useSales';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { Truck } from 'lucide-react';

export default function Distribusi() {
  const [activeTab, setActiveTab] = useState<'Deliveries' | 'Pending Sales Orders'>('Deliveries');
  
  const { deliveries, loading: loadingDeliveries, refetch: refetchDeliveries } = useSalesDeliveries();
  const { salesOrders, loading: loadingSOs, refetch: refetchSOs } = useDeliverableSalesOrders();
  const { createDelivery, loading: isSubmitting } = useCreateSalesDelivery();

  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [selectedSO, setSelectedSO] = useState<any | null>(null);
  
  const [form, setForm] = useState<any>({
    scheduled_date: new Date().toISOString().split('T')[0],
    driver: '',
    vehicle_number: '',
    notes: '',
    items: []
  });

  const openDeliveryModal = (so: any) => {
    setSelectedSO(so);
    setForm({
      scheduled_date: new Date().toISOString().split('T')[0],
      driver: '',
      vehicle_number: '',
      notes: '',
      items: (so.items || []).map((item: any) => ({
        sales_order_item_id: item.id,
        inventory_item_id: item.product_id, // simplistic, assumes product_id = item_id in this context
        item_name: item.product_id, // we don't have full name without joins, keeping simple
        ordered: item.quantity,
        delivered_so_far: item.delivered_quantity || 0,
        quantity_delivered: Math.max(0, item.quantity - (item.delivered_quantity || 0)),
        unit_hpp: 0
      })).filter((i: any) => i.quantity_delivered > 0)
    });
    setIsDeliveryModalOpen(true);
  };

  const handleSubmitDelivery = async (e: any) => {
    e.preventDefault();
    if (!selectedSO) return;
    
    // Validate
    if (form.items.some((i: any) => i.quantity_delivered <= 0 || i.quantity_delivered > (i.ordered - i.delivered_so_far))) {
      alert("Kuantitas pengiriman tidak valid.");
      return;
    }

    try {
      await createDelivery({
        sales_order_id: selectedSO.id,
        customer_name: selectedSO.customer_name,
        customer_address: selectedSO.customer_address,
        scheduled_date: form.scheduled_date,
        driver: form.driver,
        vehicle_number: form.vehicle_number,
        notes: form.notes,
        items: form.items
      });
      alert('Delivery berhasil dibuat dan stok gudang telah terpotong.');
      setIsDeliveryModalOpen(false);
      refetchDeliveries();
      refetchSOs();
    } catch (err: any) {
      alert("Gagal memproses pengiriman: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold leading-7 text-slate-900">Distribusi & Pengiriman</h2>
          <p className="mt-1 text-sm text-slate-500">Kelola pengiriman dari Sales Order (DO) dan pemotongan stok.</p>
        </div>
      </div>

      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          <button onClick={() => setActiveTab('Deliveries')} className={`py-4 px-1 border-b-2 text-sm font-medium ${activeTab === 'Deliveries' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:border-slate-300'}`}>Daftar Pengiriman (DO)</button>
          <button onClick={() => setActiveTab('Pending Sales Orders')} className={`py-4 px-1 border-b-2 text-sm font-medium ${activeTab === 'Pending Sales Orders' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:border-slate-300'}`}>Antrian Pengiriman (Pending SO)</button>
        </nav>
      </div>

      {activeTab === 'Deliveries' && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          {loadingDeliveries ? <div className="p-8 text-center text-slate-500">Loading...</div> : (
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">No. DO</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold text-slate-900">Tanggal Kirim</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold text-slate-900">Sopir / Plat</th>
                  <th className="px-3 py-3 text-center text-sm font-semibold text-slate-900">Status DO</th>
                  <th className="px-3 py-3 text-center text-sm font-semibold text-slate-900">Status Tagihan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {deliveries.map((d: any) => (
                  <tr key={d.id}>
                    <td className="px-4 py-4 text-sm font-bold text-brand-600">{d.delivery_number}</td>
                    <td className="px-3 py-4 text-sm text-slate-500">{new Date(d.scheduled_date).toLocaleDateString('id-ID')}</td>
                    <td className="px-3 py-4 text-sm text-slate-900">{d.driver || '-'} / {d.vehicle_number || '-'}</td>
                    <td className="px-3 py-4 text-sm text-center">
                      <Badge variant="success">{d.status}</Badge>
                    </td>
                    <td className="px-3 py-4 text-sm text-center">
                      <Badge variant={d.finance_status === 'Invoice Eligible' ? 'info' : 'success'}>{d.finance_status}</Badge>
                    </td>
                  </tr>
                ))}
                {deliveries.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-slate-500">Tidak ada pengiriman.</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'Pending Sales Orders' && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
           {loadingSOs ? <div className="p-8 text-center text-slate-500">Loading...</div> : (
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">No. SO</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold text-slate-900">Customer</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold text-slate-900">Status SO</th>
                  <th className="px-3 py-3 text-right text-sm font-semibold text-slate-900">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {salesOrders.map((so: any) => (
                  <tr key={so.id}>
                    <td className="px-4 py-4 text-sm font-bold text-slate-900">{so.so_number || so.order_number}</td>
                    <td className="px-3 py-4 text-sm text-slate-500">{so.customer_name}</td>
                    <td className="px-3 py-4 text-sm">
                      <Badge variant="info">{so.status}</Badge>
                    </td>
                    <td className="px-3 py-4 text-sm text-right">
                       <button onClick={() => openDeliveryModal(so)} className="inline-flex items-center gap-1 px-3 py-1.5 bg-brand-600 text-white text-xs font-medium rounded hover:bg-brand-700">
                          <Truck className="w-4 h-4" /> Kirim Barang
                       </button>
                    </td>
                  </tr>
                ))}
                {salesOrders.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-slate-500">Tidak ada antrian pengiriman.</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* CREATE DELIVERY MODAL */}
      <Modal isOpen={isDeliveryModalOpen} onClose={() => setIsDeliveryModalOpen(false)} title="Kirim Barang (DO)">
         <form onSubmit={handleSubmitDelivery} className="space-y-4 max-h-[75vh] overflow-y-auto px-1">
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-sm font-medium text-slate-900">Tanggal Kirim</label>
                  <input type="date" required value={form.scheduled_date} onChange={e => setForm({...form, scheduled_date: e.target.value})} className="mt-1 block w-full rounded-md border-slate-300 sm:text-sm" />
               </div>
               <div>
                  <label className="block text-sm font-medium text-slate-900">Sopir / PIC</label>
                  <input type="text" value={form.driver} onChange={e => setForm({...form, driver: e.target.value})} className="mt-1 block w-full rounded-md border-slate-300 sm:text-sm" />
               </div>
            </div>
            <div>
               <label className="block text-sm font-medium text-slate-900">No. Kendaraan (Plat)</label>
               <input type="text" value={form.vehicle_number} onChange={e => setForm({...form, vehicle_number: e.target.value})} className="mt-1 block w-full rounded-md border-slate-300 sm:text-sm" />
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mt-4">
               <h4 className="text-sm font-medium text-slate-900 mb-3 border-b pb-2">Item yang akan dikirim</h4>
               {form.items.length === 0 ? (
                  <p className="text-sm text-slate-500">Semua item sudah terkirim penuh.</p>
               ) : (
                  <table className="min-w-full text-sm">
                     <thead>
                        <tr>
                           <th className="text-left font-medium pb-2 text-slate-600">Product ID</th>
                           <th className="text-right font-medium pb-2 text-slate-600">Sisa Order</th>
                           <th className="text-right font-medium pb-2 text-slate-600">Kirim Qty</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                        {form.items.map((item: any, idx: number) => (
                           <tr key={idx}>
                              <td className="py-2 text-slate-900 font-medium">{item.item_name}</td>
                              <td className="py-2 text-right text-slate-600">{item.ordered - item.delivered_so_far}</td>
                              <td className="py-2 text-right">
                                 <input 
                                    type="number" 
                                    min="1" 
                                    max={item.ordered - item.delivered_so_far}
                                    value={item.quantity_delivered}
                                    onChange={(e) => {
                                       const newItems = [...form.items];
                                       newItems[idx].quantity_delivered = Number(e.target.value);
                                       setForm({...form, items: newItems});
                                    }}
                                    className="w-20 text-right rounded-md border-slate-300 py-1 text-sm"
                                 />
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               )}
            </div>
            
            <div className="mt-5 flex gap-3">
               <button type="submit" disabled={isSubmitting || form.items.length === 0} className="w-full justify-center rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-50">
                  {isSubmitting ? 'Memproses...' : 'Kirim & Potong Stok'}
               </button>
            </div>
         </form>
      </Modal>
    </div>
  );
}
