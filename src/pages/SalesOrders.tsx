import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye } from 'lucide-react';
import { useSalesOrders } from '../hooks/useSalesOrders';
import { useCustomers } from '../hooks/useCustomers';
import { useProject } from '../contexts/ProjectContext';
import { useItems } from '../hooks/useItems';
import Modal from '../components/Modal';
import Badge from '../components/Badge';

export default function SalesOrders() {
  const navigate = useNavigate();
  const { activeProject } = useProject();
  const { data: orders, loading, createOrder } = useSalesOrders(activeProject?.id);
  const { data: customers, addCustomer } = useCustomers();
  const { data: items } = useItems();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState('');

  // Form State
  const [customerId, setCustomerId] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerAddress, setNewCustomerAddress] = useState('');
  const [soDate, setSoDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('Tunai');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [qty, setQty] = useState<number | ''>('');
  const [unitPrice, setUnitPrice] = useState<number | ''>('');

  const filteredOrders = orders.filter(o => 
    o.so_number.toLowerCase().includes(search.toLowerCase()) || 
    o.customer?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleProductSelect = (id: string) => {
    setSelectedProductId(id);
    const item = items?.find(i => i.id === id);
    if (item) {
      setUnitPrice(item.sellingPrice || item.packagePrice || item.price || 0);
    }
  };

  const handleCreate = async (e: any) => {
    e.preventDefault();
    if (!activeProject) {
      alert('Project aktif harus dipilih sebelum membuat Order!');
      return;
    }
    
    setIsSaving(true);
    try {
      let finalCustomerId = customerId;
      if (customerId === 'NEW') {
        if (!newCustomerName) throw new Error('Nama customer baru wajib diisi');
        const cust = await addCustomer({ 
          name: newCustomerName,
          phone: newCustomerPhone,
          address: newCustomerAddress
        });
        finalCustomerId = cust.id;
      }

      const q = Number(qty) || 0;
      const p = Number(unitPrice) || 0;
      const total = q * p;

      const orderPayload = {
        project_id: activeProject.id,
        customer_id: finalCustomerId,
        so_date: soDate,
        total_amount: total,
        payment_method: paymentMethod
      };

      const itemsPayload = [{
        product_id: selectedProductId,
        quantity: q,
        unit_price: p,
        total_price: total
      }];

      const newOrder = await createOrder(orderPayload, itemsPayload);
      setIsModalOpen(false);
      navigate(`/sales/orders/${newOrder.id}`);
    } catch (err: any) {
      alert(err.message || 'Gagal membuat order');
    } finally {
      setIsSaving(false);
    }
  };

  const openModal = () => {
    setCustomerId('');
    setNewCustomerName('');
    setSelectedProductId('');
    setQty('');
    setUnitPrice('');
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Order Penjualan</h2>
          <p className="text-sm text-slate-500">Kelola pesanan paket usaha dan produk retail SBS</p>
        </div>
        <button onClick={openModal} className="bg-brand-600 text-white px-4 py-2 rounded-md font-medium flex items-center gap-2 hover:bg-brand-700">
          <Plus className="w-4 h-4" /> Buat Order
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Cari order atau customer..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 rounded-md border border-slate-300 text-sm" />
          </div>
        </div>
        
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Nomor Order</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Tanggal</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Customer</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Total</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Status</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-4 text-slate-500">Memuat data...</td></tr>
            ) : filteredOrders.map(o => (
              <tr key={o.id}>
                <td className="px-4 py-3 font-medium text-brand-600">{o.so_number}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{o.so_date}</td>
                <td className="px-4 py-3 text-sm text-slate-900">{o.customer?.name}</td>
                <td className="px-4 py-3 text-sm text-slate-900 font-medium">Rp {Number(o.total_amount).toLocaleString('id-ID')}</td>
                <td className="px-4 py-3 text-center">
                  <Badge variant={o.status === 'Draft' ? 'default' : o.status === 'Dikonfirmasi' ? 'warning' : 'success'}>
                    {o.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => navigate(`/sales/orders/${o.id}`)} className="text-brand-600 hover:text-brand-900">
                    <Eye className="w-5 h-5 mx-auto" />
                  </button>
                </td>
              </tr>
            ))}
            {!loading && filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-slate-500">
                    Tidak ada order penjualan.
                    <span className="text-xs text-slate-400 mt-2 block">Belum ada penjualan. Buat order penjualan dari produk atau paket.</span>
                  </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Buat Order Baru">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="bg-slate-50 p-3 rounded text-sm text-slate-600">
            Order akan dicatat untuk Project: <strong>{activeProject?.name || 'BELUM ADA PROJECT TERPILIH'}</strong>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Tanggal Order</label>
              <input type="date" required value={soDate} onChange={e => setSoDate(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Metode Bayar</label>
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2">
                <option value="Tunai">Tunai / Transfer</option>
                <option value="Tempo">Tempo / Piutang</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Customer</label>
            <select required value={customerId} onChange={e => setCustomerId(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2">
              <option value="">-- Pilih Customer --</option>
              <option value="NEW">+ Customer Baru</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {customerId === 'NEW' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Nama Customer Baru</label>
                <input type="text" required value={newCustomerName} onChange={e => setNewCustomerName(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">No. WhatsApp</label>
                  <input type="text" value={newCustomerPhone} onChange={e => setNewCustomerPhone(e.target.value)} placeholder="Contoh: 0812..." className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Alamat Antar</label>
                  <input type="text" value={newCustomerAddress} onChange={e => setNewCustomerAddress(e.target.value)} placeholder="Jalan / Perumahan..." className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
                </div>
              </div>
            </div>
          )}

          <div className="border-t border-slate-200 pt-4 mt-4">
            <h4 className="font-semibold text-slate-800 mb-3">Produk / Paket</h4>
            <div>
              <label className="block text-sm font-medium text-slate-700">Pilih Barang</label>
              <select required value={selectedProductId} onChange={e => handleProductSelect(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2">
                <option value="">-- Pilih Paket / Produk --</option>
                <optgroup label="Paket Usaha">
                  {items?.filter((i:any) => i.itemType === 'PACKAGE').map((i:any) => <option key={i.id} value={i.id}>{i.name}</option>)}
                </optgroup>
                <optgroup label="Produk Retail">
                  {items?.filter((i:any) => i.itemType !== 'PACKAGE').map((i:any) => <option key={i.id} value={i.id}>{i.name}</option>)}
                </optgroup>
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Kuantitas</label>
                <input type="number" min="1" required value={qty} onChange={e => setQty(Number(e.target.value))} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Harga Satuan</label>
                <input type="number" required value={unitPrice} onChange={e => setUnitPrice(Number(e.target.value))} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button type="submit" disabled={isSaving || !activeProject} className="bg-brand-600 text-white px-4 py-2 rounded-md font-medium hover:bg-brand-700 disabled:opacity-50">
              {isSaving ? 'Menyimpan...' : 'Buat Order'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
