import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye } from 'lucide-react';
import { useShipments } from '../hooks/useShipments';
import { useSalesOrders } from '../hooks/useSalesOrders';
import { useProject } from '../contexts/ProjectContext';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import toast from 'react-hot-toast';

export default function Distribution() {
  const navigate = useNavigate();
  const { activeProject } = useProject();
  const { data: shipments, loading, createShipment } = useShipments(activeProject?.id);
  
  // We need to fetch sales orders to find ones that are ready to be shipped
  // i.e., status = 'Siap Dikirim' and stock_processed_at is not null
  const { data: orders } = useSalesOrders(activeProject?.id);
  const readyOrders = useMemo(() => {
    return orders.filter(o => (o.status === 'Siap Dikirim' || o.status === 'Dikonfirmasi') && o.stock_processed_at);
  }, [orders]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState('');

  // Form State
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [driverName, setDriverName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [notes, setNotes] = useState('');

  const filteredShipments = shipments.filter(s => 
    s.do_number?.toLowerCase().includes(search.toLowerCase()) || 
    s.sales_order?.so_number?.toLowerCase().includes(search.toLowerCase()) ||
    s.sales_order?.customer?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleOrderSelect = (orderId: string) => {
    setSelectedOrderId(orderId);
    const order = readyOrders.find(o => o.id === orderId);
    if (order && order.customer?.address) {
      setDeliveryAddress(order.customer.address);
    } else {
      setDeliveryAddress('');
    }
  };

  const handleCreate = async (e: any) => {
    e.preventDefault();
    if (!activeProject) {
      toast.error('Project aktif harus dipilih sebelum membuat Pengiriman!');
      return;
    }
    
    setIsSaving(true);
    try {
      const payload = {
        project_id: activeProject.id,
        so_id: selectedOrderId,
        delivery_date: deliveryDate,
        driver_name: driverName,
        vehicle_number: vehicleNumber,
        delivery_address: deliveryAddress,
        notes: notes
      };

      const newShipment = await createShipment(payload);
      setIsModalOpen(false);
      navigate(`/distribution/shipments/${newShipment.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Gagal membuat jadwal pengiriman');
    } finally {
      setIsSaving(false);
    }
  };

  const openModal = () => {
    setSelectedOrderId('');
    setDeliveryAddress('');
    setDriverName('');
    setVehicleNumber('');
    setNotes('');
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Pengiriman Barang</h2>
          <p className="text-sm text-slate-500">Kelola jadwal dan pengiriman pesanan ke pelanggan</p>
        </div>
        <button onClick={openModal} className="bg-brand-600 text-white px-4 py-2 rounded-md font-medium flex items-center gap-2 hover:bg-brand-700">
          <Plus className="w-4 h-4" /> Buat Jadwal
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Cari pengiriman..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 rounded-md border border-slate-300 text-sm" />
          </div>
        </div>
        
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Surat Jalan</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Order / Customer</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Tanggal Kirim</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Driver</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Status</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-4 text-slate-500">Memuat data...</td></tr>
            ) : filteredShipments.map(s => (
              <tr key={s.id}>
                <td className="px-4 py-3 font-medium text-brand-600">{s.do_number}</td>
                <td className="px-4 py-3">
                  <div className="text-sm font-medium text-slate-900">{s.sales_order?.so_number}</div>
                  <div className="text-xs text-slate-500">{s.sales_order?.customer?.name}</div>
                </td>
                <td className="px-4 py-3 text-sm text-slate-900">{s.delivery_date}</td>
                <td className="px-4 py-3">
                  <div className="text-sm text-slate-900">{s.driver_name || '-'}</div>
                  <div className="text-xs text-slate-500">{s.vehicle_number}</div>
                </td>
                <td className="px-4 py-3 text-center">
                  <Badge variant={s.status === 'Dalam Pengiriman' ? 'warning' : s.status === 'Diterima' ? 'success' : s.status === 'Gagal/Kendala' ? 'danger' : 'default'}>
                    {s.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => navigate(`/distribution/shipments/${s.id}`)} className="text-brand-600 hover:text-brand-900">
                    <Eye className="w-5 h-5 mx-auto" />
                  </button>
                </td>
              </tr>
            ))}
            {!loading && filteredShipments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-slate-500">
                    Belum ada jadwal pengiriman.
                    <span className="text-xs text-slate-400 mt-2 block">Belum ada pengiriman. Order yang sudah diproses barang keluar akan muncul di sini.</span>
                  </td>
                </tr> ) : null}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Buat Jadwal Pengiriman">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="bg-slate-50 p-3 rounded text-sm text-slate-600">
            Hanya order dengan status <strong>Siap Dikirim</strong> (stok sudah diproses) yang bisa dijadwalkan.
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Pilih Order Penjualan</label>
            <select required value={selectedOrderId} onChange={e => handleOrderSelect(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2">
              <option value="">-- Pilih Order --</option>
              {readyOrders.map(o => (
                <option key={o.id} value={o.id}>
                  {o.so_number} - {o.customer?.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Alamat Pengiriman</label>
            <textarea required rows={2} value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Alamat lengkap..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Tanggal Kirim</label>
              <input type="date" required value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Nama Petugas/Driver</label>
              <input type="text" required value={driverName} onChange={e => setDriverName(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Cth: Budi" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Plat / Kendaraan (Opsional)</label>
              <input type="text" value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Cth: B 1234 XYZ" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Catatan (Opsional)</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Cth: Hubungi jika sudah sampai pos" />
          </div>

          <div className="flex justify-end pt-4">
            <button type="submit" disabled={isSaving || !activeProject} className="bg-brand-600 text-white px-4 py-2 rounded-md font-medium hover:bg-brand-700 disabled:opacity-50">
              {isSaving ? 'Menyimpan...' : 'Buat Jadwal'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
