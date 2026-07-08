import toast from 'react-hot-toast';
 import { useState, useEffect } from 'react'; 
import { getDataProvider } from '../providers';
import { salesFulfillmentService } from '../services/salesFulfillment';
import { arApService } from '../services/arApService';
import type { SalesOrder, Project, Product, Package, InventoryReservation, SalesDelivery, PackageComponent, Item } from '../types';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { Edit, Search, ShoppingCart, AlertTriangle, Info, CheckCircle, Truck, Box } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { CurrencyInput } from '../components/ui/CurrencyInput';

export default function Sales() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [reservations, setReservations] = useState<InventoryReservation[]>([]);
  const [deliveries, setDeliveries] = useState<SalesDelivery[]>([]);
  const [customerInvoices, setCustomerInvoices] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [packageComponents, setPackageComponents] = useState<PackageComponent[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeDetailTab, setActiveDetailTab] = useState<'info'|'fulfillment'|'delivery'|'cost'|'audit'>('info');
  
  const [form, setForm] = useState<Partial<SalesOrder>>({
    project_id: '', customer_name: '', customer_phone: '', customer_address: '',
    date: new Date().toISOString().split('T')[0], order_type: 'Produk', // item_id: '',
    qty: 1, unit_price: 0, discount: 0, shipping_cost: 0, down_payment: 0,
    status: 'Draft', payment_status: 'Belum Bayar', notes: ''
  });

  const [deliveryForm, setDeliveryForm] = useState<any>({
    scheduled_date: new Date().toISOString().split('T')[0],
    driver: '', vehicle_number: '', notes: '',
    items: []
  });

  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const provider = getDataProvider();
    try { setOrders(await provider.getSalesOrderRepository().listSalesOrders()); } catch(e) { console.warn('loadData: sales_orders error', e); }
    try { setProjects(await provider.getProjectRepository().listProjects()); } catch(e) { console.warn('loadData: projects error', e); }
    try { setProducts(await provider.getRepository<Product>('products').list()); } catch(e) { console.warn('loadData: products error', e); }
    try { setPackages(await provider.getRepository<Package>('packages').list()); } catch(e) { console.warn('loadData: packages error', e); }
    try { setReservations(await provider.getRepository<InventoryReservation>('inventory_reservations').list()); } catch(e) { console.warn('loadData: reservations error', e); }
    try { setDeliveries(await provider.getSalesDeliveryRepository().listSalesDeliveries()); } catch(e) { console.warn('loadData: deliveries error', e); }
    try { setCustomerInvoices(await provider.getRepository('customer_invoices').list()); } catch(e) { console.warn('loadData: customer_invoices error', e); }
    try {
      const logs = await provider.getRepository<any>('audit_logs').list();
      setAuditLogs(logs.sort((a: any,b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch(e) { console.warn('loadData: audit_logs error', e); }
    try { setItems(await provider.getItemRepository().listItems()); } catch(e) { console.warn('loadData: items error', e); }
    try { setPackageComponents(await provider.getRepository<PackageComponent>('package_components').list()); } catch(e) { console.warn('loadData: package_components error', e); }
  };

  const getSubtotal = () => (form.unit_price || 0) * (form.qty || 1);
  const getTotal = () => getSubtotal() - (form.discount || 0) + (form.shipping_cost || 0);
  
  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!form.project_id || !form.customer_name || !form.item_id) {
      toast.error('Mohon lengkapi data order.');
      return;
    }
    
    const provider = getDataProvider();
    
    if (editingId) {
      await provider.getSalesOrderRepository().updateSalesOrderStatus(editingId, form.status || 'Draft');
      // Update other details
      await provider.getRepository('sales_orders').update(editingId, { ...form, total_amount: getTotal() });
      try {
        await provider.getRepository('audit_logs').create({ reference_id: editingId, type: 'SalesOrder', action: 'Updated', user: 'Admin', created_at: new Date().toISOString() });
      } catch (e) { console.warn('Audit log failed', e); }
    } else {
      const count = orders.length + 1;
      const soNum = `SO-${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2, '0')}-${String(count).padStart(3, '0')}`;
      const newOrder = await provider.getSalesOrderRepository().createSalesOrder({ 
        ...form, 
        organization_id: profile?.organization_id || '11111111-1111-1111-1111-111111111111',
        order_number: soNum,
        total_amount: getTotal(),
        items: [{ product_id: form.item_id, quantity: form.qty, unit_price: form.unit_price }]
      });
      try {
        await provider.getRepository('audit_logs').create({ reference_id: newOrder.id, type: 'SalesOrder', action: 'Created', user: 'Admin', created_at: new Date().toISOString() });
      } catch (e) { console.warn('Audit log failed', e); }
    }
    
    setIsModalOpen(false);
    loadData();
  };
  
  const openAdd = () => {
    setEditingId(null);
    setForm({
      project_id: projects.length > 0 ? projects[0].id : '', customer_name: '', customer_phone: '', customer_address: '',
      date: new Date().toISOString().split('T')[0], order_type: 'Produk', // item_id: '',
      qty: 1, unit_price: 0, discount: 0, shipping_cost: 0, down_payment: 0,
      status: 'Draft', payment_status: 'Belum Bayar', notes: ''
    });
    setIsModalOpen(true);
  };

  const openEdit = (o: SalesOrder) => {
    setEditingId(o.id);
    setForm(o);
    setIsModalOpen(true);
  };

  const openDetail = (o: SalesOrder) => {
    setSelectedOrder(o);
    setActiveDetailTab('info');
    setIsDetailOpen(true);
  };

  const getItemName = (type: string, id: string) => {
    if (type === 'Produk') return products.find(p => p.id === id)?.name || 'Unknown';
    return packages.find(p => p.id === id)?.name || 'Unknown';
  };

  const getInventoryItemName = (id: string) => items.find(i => i.id === id)?.name || id;
  const getProjectName = (id: string) => projects.find(p => p.id === id)?.name || 'Unknown';

  const filteredOrders = orders.filter(o => 
    o.order_number.toLowerCase().includes(search.toLowerCase()) || 
    o.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    getItemName(o.order_type, o.item_id).toLowerCase().includes(search.toLowerCase())
  );

  // Workflow Actions
  const handleConfirmOrder = async (id: string) => {
    const provider = getDataProvider();
    await provider.getRepository('sales_orders').update(id, { status: 'Confirmed' });
    await provider.getRepository('audit_logs').create({ reference_id: id, type: 'SalesOrder', action: 'Confirmed', user: 'Admin', created_at: new Date().toISOString() });
    toast.error('Order Confirmed'); loadData();
    if(selectedOrder && selectedOrder.id === id) setSelectedOrder({...selectedOrder, status: 'Confirmed'});
  };

  const handleCancelOrder = async (id: string) => {
    if(confirm('Batalkan order ini?')) {
      const provider = getDataProvider();
      await provider.getRepository('sales_orders').update(id, { status: 'Cancelled' });
      await provider.getRepository('audit_logs').create({ reference_id: id, type: 'SalesOrder', action: 'Cancelled', user: 'Admin', created_at: new Date().toISOString() });
      loadData();
      if(selectedOrder && selectedOrder.id === id) setSelectedOrder({...selectedOrder, status: 'Cancelled'});
    }
  };

  const handleReserve = async (id: string) => {
    const res = salesFulfillmentService.reserveSalesOrderStock(id, 'Admin');
    if(res.success) {
      toast.error('Reservasi stok diproses.'); 
      await loadData();
      if(selectedOrder && selectedOrder.id === id) {
        const updated = await getDataProvider().getSalesOrderRepository().getSalesOrderById(id);
        if (updated) setSelectedOrder(updated);
      }
    } else toast.error('Gagal: ' + res.message);
  };

  const handleRelease = async (id: string) => {
    const res = salesFulfillmentService.releaseSalesOrderReservation(id, 'Admin');
    if(res.success) {
      toast.error('Reservasi stok dilepas.');
      await loadData();
      if(selectedOrder && selectedOrder.id === id) {
        const updated = await getDataProvider().getSalesOrderRepository().getSalesOrderById(id);
        if (updated) setSelectedOrder(updated);
      }
    } else toast.error('Gagal: ' + res.message);
  };

  const handleCompleteOrder = async (id: string) => {
    const provider = getDataProvider();
    await provider.getRepository('sales_orders').update(id, { status: 'Completed' });
    await provider.getRepository('audit_logs').create({ reference_id: id, type: 'SalesOrder', action: 'Completed', user: 'Admin', created_at: new Date().toISOString() });
    toast.error('Order Completed'); loadData();
    if(selectedOrder && selectedOrder.id === id) setSelectedOrder({...selectedOrder, status: 'Completed'});
  };

  const openCreateDelivery = (o: SalesOrder) => {
    const activeRes = reservations.filter(r => r.sales_order_id === o.id && r.status === 'Active' && r.quantity > 0);
    if(activeRes.length === 0) return toast.error('Tidak ada item yang dapat dikirim (belum direservasi atau sudah terkirim semua).');

    setDeliveryForm({
      sales_order_id: o.id,
      customer_name: o.customer_name,
      customer_address: o.customer_address,
      scheduled_date: new Date().toISOString().split('T')[0],
      driver: '', vehicle_number: '', notes: '',
      items: activeRes.map(r => ({
        // item_id: r.item_id,
        // quantity: r.quantity,
        qty_to_deliver: r.quantity
      }))
    });
    setIsDeliveryModalOpen(true);
  };

  const handleSaveDelivery = (e: any) => {
    e.preventDefault();
    if(deliveryForm.items.some((i:any) => i.qty_to_deliver <= 0 || i.qty_to_deliver > i.quantity)) {
      return toast.error('Pastikan Qty Kirim valid (lebih dari 0 dan tidak melebihi Qty Reserved).');
    }
    const req = {
      sales_order_id: deliveryForm.sales_order_id,
      customer_name: deliveryForm.customer_name,
      customer_address: deliveryForm.customer_address,
      scheduled_date: deliveryForm.scheduled_date,
      driver: deliveryForm.driver,
      vehicle_number: deliveryForm.vehicle_number,
      notes: deliveryForm.notes,
      items: deliveryForm.items.map((i:any) => ({
        // item_id: i.item_id,
        qty_to_deliver: i.qty_to_deliver
      }))
    };
    const res = salesFulfillmentService.createSalesDelivery(req.sales_order_id, req.scheduled_date, req.driver, 'Admin');
    if(res.success) {
      toast.success('Delivery Order berhasil dibuat.');
      setIsDeliveryModalOpen(false);
      loadData();
    } else toast.error('Gagal: ' + res.message);
  };

  const handleCreateInvoice = (d: SalesDelivery, so: SalesOrder) => {
    // Check remaining billable
    const existingInvoices = customerInvoices.filter(i => i.reference_id === d.id);
    const invoicedAmt = existingInvoices.reduce((sum, i) => sum + i.total_amount, 0);
    
    // We assume standard DO invoice amount is proportional, but let's just bill total order amt minus what's been invoiced
    const totalOrderAmount = (so.qty * so.unit_price) - (so.discount || 0) + (so.shipping_cost || 0);
    // const existingInvoicesForSO = customerInvoices.filter(i => i.project_id === so.project_id && i.customer_id === so.customer_name); 
    // This is a bit tricky, but since it's 1 DO to 1 Invoice usually, let's just bill totalAmount for this SO if not yet billed for this DO.
    const remaining_billable = totalOrderAmount - invoicedAmt;
    
    if (remaining_billable <= 0) {
      toast.error("Sudah tidak ada tagihan tersisa untuk delivery ini.");
      return;
    }
    
    try {
      arApService.createCustomerInvoice({
        customer_id: so.customer_name,
        project_id: so.project_id,
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0], // 30 days default
        total_amount: remaining_billable,
        subtotal: remaining_billable,
        discount: 0,
        tax: 0,
        sales_order_id: d.sales_order_id,
        sales_delivery_id: d.id
      }, 'Admin');
      toast.success("Invoice berhasil dibuat.");
      loadData();
    } catch (e: any) {
      toast.error("Gagal membuat invoice: " + e.message);
    }
  };

  const getFulfillmentData = (so: SalesOrder) => {
    const reqs: any[] = [];
    if(so.order_type === 'Produk') {
      const p = products.find(x => x.id === so.item_id);
      if(p && p.inventory_item_id) {
        reqs.push({ itemId: p.inventory_item_id, required: so.qty, name: getInventoryItemName(p.inventory_item_id) });
      }
    } else {
      const comps = packageComponents.filter(c => c.package_id === so.item_id);
      comps.forEach(c => {
        reqs.push({ itemId: c.item_id, required: so.qty * c.quantity_per_package, name: getInventoryItemName(c.item_id) });
      });
    }

    return reqs.map(req => {
      const resv = reservations.find(r => r.sales_order_id === so.id && r.item_id === req.itemId && r.status === 'Active');
      const reserved = resv ? resv.quantity : 0;
      const fulfilled = 0;
      const shortage = Math.max(0, req.required - reserved);
      
      // Note: inventory movements are loaded via provider in loadData()
      // Use a simplified stock calculation from the loaded data
      const currentStock = 0; // Fulfillment data is for reference only in legacy mode
      const otherResv = reservations.filter(r => r.item_id === req.itemId && r.status === 'Active').reduce((acc, r) => acc + r.quantity, 0);
      const available = currentStock - otherResv;

      return { ...req, reserved, fulfilled, shortage, currentStock, available };
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold leading-7 text-slate-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Sales Orders
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Kelola data pemesanan, pemotongan stok, pengiriman, dan retur penjualan.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-x-2 rounded-md bg-brand-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-500"
        >
          <ShoppingCart className="-ml-0.5 h-5 w-5" />
          Buat Sales Order
        </button>
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Search className="h-5 w-5 text-slate-400" />
        </div>
        <input
          type="text"
          className="block w-full max-w-md rounded-md border-0 py-1.5 pl-10 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm sm:leading-6"
          placeholder="Cari No Order, Customer, atau Produk..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="table-wrapper overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="table-header">
            <tr>
              <th className="py-3.5 pl-4 pr-3 text-left">No. Order</th>
              <th className="px-3 py-3.5 text-left">Tanggal</th>
              <th className="px-3 py-3.5 text-left">Customer</th>
              <th className="px-3 py-3.5 text-left">Produk/Paket</th>
              <th className="px-3 py-3.5 text-right">Total (Rp)</th>
              <th className="px-3 py-3.5 text-center">Bayar</th>
              <th className="px-3 py-3.5 text-center">Status</th>
              <th className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Aksi</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {filteredOrders.map((o) => {
              const subtotal = o.qty * o.unit_price;
              const total = subtotal - o.discount + o.shipping_cost;
              return (
                <tr key={o.id} className="table-row-hover">
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-bold text-brand-600 cursor-pointer hover:text-brand-800" onClick={() => openDetail(o)}>{o.order_number}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{new Date(o.date).toLocaleDateString('id-ID')}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-900 font-medium">{o.customer_name}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{getItemName(o.order_type, o.item_id)} <span className="text-xs text-slate-400">x{o.qty}</span></td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-900 text-right font-medium">{total.toLocaleString('id-ID')}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-center">
                    <Badge variant={o.payment_status === 'Lunas' ? 'success' : o.payment_status === 'DP' ? 'warning' : 'danger'}>{o.payment_status}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-center">
                    <Badge variant={o.status === 'Completed' ? 'success' : o.status === 'Cancelled' ? 'danger' : 'info'}>{o.status}</Badge>
                  </td>
                  <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                    {o.status === 'Draft' && <button onClick={() => openEdit(o)} className="text-brand-600 hover:text-brand-900 mr-3"><Edit className="h-4 w-4" /></button>}
                    <button onClick={() => openDetail(o)} className="text-slate-600 hover:text-slate-900"><Info className="h-4 w-4" /></button>
                  </td>
                </tr>
              );
            })}
            {filteredOrders.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-sm text-slate-500">Tidak ada data Sales Order.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* CREATE / EDIT MODAL (Hanya Form Dasar SO) */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Edit Sales Order' : 'Buat Sales Order Baru'}>
        <form onSubmit={handleSubmit as any} className="space-y-4 max-h-[75vh] overflow-y-auto px-1">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-900">Project</label>
              <select required value={form.project_id} onChange={e => setForm({...form, project_id: e.target.value})} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm">
                <option value="">Pilih Project...</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900">Tanggal Order</label>
              <input type="date" required value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm" />
            </div>
          </div>
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
            <h4 className="text-sm font-medium text-slate-900 border-b pb-2">Informasi Customer</h4>
            <div>
              <label className="block text-sm font-medium text-slate-900">Nama Customer</label>
              <input type="text" required value={form.customer_name} onChange={e => setForm({...form, customer_name: e.target.value})} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900">Alamat Lengkap</label>
              <textarea rows={2} required value={form.customer_address} onChange={e => setForm({...form, customer_address: e.target.value})} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm" />
            </div>
          </div>
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
            <h4 className="text-sm font-medium text-slate-900 border-b pb-2">Detail Pesanan</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-900">Jenis Order</label>
                <select value={form.order_type} onChange={e => setForm({...form, order_type: e.target.value as any, item_id: ''})} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm">
                  <option value="Produk">Produk Satuan</option>
                  <option value="Paket">Paket Usaha Sultan</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-900">Pilih {form.order_type}</label>
                <select required value={form.item_id} onChange={e => setForm({...form, item_id: e.target.value})} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm">
                  <option value="">Pilih...</option>
                  {form.order_type === 'Produk' ? products.map(p => <option key={p.id} value={p.id}>{p.name}</option>) : packages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-900">Qty</label>
                <input type="number" min="1" required value={form.qty} onChange={e => setForm({...form, qty: Number(e.target.value)})} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-900">Harga Satuan (Rp)</label>
                <CurrencyInput  required value={form.unit_price} onChange={(val) => setForm({...form, unit_price: val})} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm" />
              </div>
            </div>
          </div>
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
            <h4 className="text-sm font-medium text-slate-900 border-b pb-2">Kalkulasi Tagihan</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-900">Diskon (Rp)</label>
                <CurrencyInput  min="0" value={form.discount} onChange={(val) => setForm({...form, discount: val})} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-900">Ongkos Kirim (Rp)</label>
                <CurrencyInput  min="0" value={form.shipping_cost} onChange={(val) => setForm({...form, shipping_cost: val})} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm" />
              </div>
            </div>
            <div className="flex justify-between text-base font-bold bg-slate-200 p-2 rounded-md">
              <span className="text-slate-800">Total Order</span>
              <span className="text-brand-700">Rp {getTotal().toLocaleString('id-ID')}</span>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900">Down Payment / DP (Rp)</label>
              <CurrencyInput  min="0" max={getTotal()} value={form.down_payment} onChange={(val) => setForm({...form, down_payment: val})} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm" />
            </div>
          </div>
          <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
            <button type="submit" className="inline-flex w-full justify-center rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-500 sm:col-start-2">Simpan Order</button>
            <button type="button" onClick={() => setIsModalOpen(false)} className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-900 ring-1 ring-inset ring-slate-300 sm:col-start-1 sm:mt-0">Batal</button>
          </div>
        </form>
      </Modal>

      {/* DETAIL MODAL WITH TABS */}
      <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title={`Detail Sales Order: ${selectedOrder?.order_number}`}>
        {selectedOrder && (() => {
          const subtotal = selectedOrder.qty * selectedOrder.unit_price;
          const total = subtotal - selectedOrder.discount + selectedOrder.shipping_cost;
          const sisa = total - selectedOrder.down_payment;
          const fulfillmentData = getFulfillmentData(selectedOrder);
          const orderDeliveries = deliveries.filter(d => d.sales_order_id === selectedOrder.id);
          const orderLogs = auditLogs.filter(l => l.reference_id === selectedOrder.id);
          
          return (
            <div className="space-y-4">
              <div className="border-b border-slate-200">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                  {['info', 'fulfillment', 'delivery', 'cost', 'audit'].map(tab => (
                    <button key={tab} onClick={() => setActiveDetailTab(tab as any)} className={`whitespace-nowrap border-b-2 py-3 px-1 text-sm font-medium ${activeDetailTab === tab ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'}`}>
                      {tab === 'info' && 'Informasi Order'}
                      {tab === 'fulfillment' && 'Fulfillment Inventory'}
                      {tab === 'delivery' && 'Pengiriman (DO)'}
                      {tab === 'cost' && 'Cost & Margin'}
                      {tab === 'audit' && 'Audit Log'}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="max-h-[60vh] overflow-y-auto px-1 py-2">
                {activeDetailTab === 'info' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center bg-slate-50 p-4 rounded-lg border border-slate-200">
                      <div>
                        <p className="text-sm text-slate-500">Status Order</p>
                        <Badge variant="info" className="mt-1 text-base">{selectedOrder.status}</Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-500">Total Order</p>
                        <p className="text-xl font-bold text-slate-900">Rp {total.toLocaleString('id-ID')}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium text-slate-900 mb-3 border-b pb-2">Informasi Pelanggan</h4>
                        <div className="text-sm text-slate-600 space-y-2">
                          <p><strong className="text-slate-900">Nama:</strong> {selectedOrder.customer_name}</p>
                          <p><strong className="text-slate-900">Project:</strong> {getProjectName(selectedOrder.project_id)}</p>
                          <p><strong className="text-slate-900">WhatsApp:</strong> {selectedOrder.customer_phone || '-'}</p>
                          <p><strong className="text-slate-900">Alamat:</strong> {selectedOrder.customer_address || '-'}</p>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-900 mb-3 border-b pb-2">Informasi Pembelian</h4>
                        <div className="text-sm text-slate-600 space-y-2">
                          <p><strong className="text-slate-900">Item:</strong> {getItemName(selectedOrder.order_type, selectedOrder.item_id)}</p>
                          <p><strong className="text-slate-900">Qty:</strong> {selectedOrder.qty}</p>
                          <p><strong className="text-slate-900">Harga Satuan:</strong> Rp {selectedOrder.unit_price.toLocaleString('id-ID')}</p>
                          <p><strong className="text-slate-900">Sisa Tagihan:</strong> Rp {sisa.toLocaleString('id-ID')} <Badge variant={selectedOrder.payment_status === 'Lunas' ? 'success' : 'danger'}>{selectedOrder.payment_status}</Badge></p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex flex-wrap gap-3">
                      <p className="w-full text-sm font-semibold text-blue-900 mb-2">Tindakan Workflow Sales Order</p>
                      {selectedOrder.status === 'Draft' && (
                        <>
                          <button onClick={() => { setIsDetailOpen(false); openEdit(selectedOrder); }} className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded text-sm hover:bg-slate-50 font-medium">Edit Order</button>
                          <button onClick={() => handleConfirmOrder(selectedOrder.id)} className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 font-medium">Confirm Order</button>
                        </>
                      )}
                      {['Confirmed', 'Production'].includes(selectedOrder.status) && (
                        <button onClick={() => handleReserve(selectedOrder.id)} className="px-3 py-1.5 bg-brand-600 text-white rounded text-sm hover:bg-brand-700 font-medium flex items-center gap-2"><Box className="w-4 h-4"/> Reserve Stock (Gudang)</button>
                      )}
                      {['Stock Reserved', 'Production', 'Partially Delivered'].includes(selectedOrder.status) && (
                         <button onClick={() => openCreateDelivery(selectedOrder)} className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700 font-medium flex items-center gap-2"><Truck className="w-4 h-4"/> Create Delivery Order</button>
                      )}
                      {['Stock Reserved', 'Production'].includes(selectedOrder.status) && (
                        <button onClick={() => handleRelease(selectedOrder.id)} className="px-3 py-1.5 bg-amber-600 text-white rounded text-sm hover:bg-amber-700 font-medium flex items-center gap-2"><AlertTriangle className="w-4 h-4"/> Release Reservation</button>
                      )}
                      {['Delivered'].includes(selectedOrder.status) && (
                        <button onClick={() => handleCompleteOrder(selectedOrder.id)} className="px-3 py-1.5 bg-sbs-green-600 text-white rounded text-sm hover:bg-sbs-green-700 font-medium flex items-center gap-2"><CheckCircle className="w-4 h-4"/> Mark as Completed</button>
                      )}
                      {['Draft', 'Confirmed'].includes(selectedOrder.status) && (
                        <button onClick={() => handleCancelOrder(selectedOrder.id)} className="px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700 font-medium ml-auto">Cancel Order</button>
                      )}
                    </div>
                  </div>
                )}

                {activeDetailTab === 'fulfillment' && (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-500">Mapping dari produk/paket ke item inventori riil di gudang.</p>
                    <table className="min-w-full divide-y divide-slate-200 border rounded-lg overflow-hidden">
                      <thead className="bg-slate-50 text-xs text-slate-500">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">Item Inventory</th>
                          <th className="px-3 py-2 text-right font-medium">Req</th>
                          <th className="px-3 py-2 text-right font-medium">Rsv</th>
                          <th className="px-3 py-2 text-right font-medium">Delv</th>
                          <th className="px-3 py-2 text-right font-medium">Short</th>
                          <th className="px-3 py-2 text-right font-medium">Gudang</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white text-sm">
                        {fulfillmentData.map((f, i) => (
                          <tr key={i}>
                            <td className="px-3 py-3 font-medium text-slate-900">{f.name}</td>
                            <td className="px-3 py-3 text-right">{f.required}</td>
                            <td className="px-3 py-3 text-right font-medium text-brand-600">{f.reserved}</td>
                            <td className="px-3 py-3 text-right text-green-600">{f.fulfilled}</td>
                            <td className="px-3 py-3 text-right text-red-500 font-bold">{f.shortage > 0 ? f.shortage : '-'}</td>
                            <td className="px-3 py-3 text-right text-slate-500">{f.available}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {fulfillmentData.some(f => f.shortage > 0) && (
                      <div className="bg-red-50 p-3 rounded text-sm text-red-800 flex gap-2">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                        <div>Ada komponen yang kekurangan stok (shortage). Tidak dapat dipenuhi seluruhnya. Segera lakukan produksi atau pengadaan.</div>
                      </div>
                    )}
                  </div>
                )}

                {activeDetailTab === 'delivery' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-slate-500">Daftar surat jalan / pengiriman untuk order ini.</p>
                      {['Stock Reserved', 'Production', 'Partially Delivered'].includes(selectedOrder.status) && (
                         <button onClick={() => openCreateDelivery(selectedOrder)} className="px-3 py-1.5 bg-brand-600 text-white rounded text-sm hover:bg-brand-700 font-medium">Create Delivery</button>
                      )}
                    </div>
                    {orderDeliveries.length === 0 ? (
                       <p className="text-sm text-center py-6 text-slate-400 border border-dashed rounded-lg">Belum ada pengiriman.</p>
                    ) : (
                      <div className="border rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-slate-200 text-sm">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-3 py-2 text-left font-medium text-slate-500">DO Number</th>
                              <th className="px-3 py-2 text-left font-medium text-slate-500">Tgl Kirim</th>
                              <th className="px-3 py-2 text-left font-medium text-slate-500">Sopir</th>
                              <th className="px-3 py-2 text-center font-medium text-slate-500">Status</th>
                              <th className="px-3 py-2 text-right font-medium text-slate-500">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 bg-white">
                            {orderDeliveries.map(d => (
                              <tr key={d.id}>
                                <td className="px-3 py-3 font-bold text-slate-900">{d.delivery_number}</td>
                                <td className="px-3 py-3 text-slate-600">{new Date(d.scheduled_date).toLocaleDateString('id-ID')}</td>
                                <td className="px-3 py-3 text-slate-600">{d.driver || '-'}</td>
                                <td className="px-3 py-3 text-center"><Badge variant="info">{d.status}</Badge></td>
                                <td className="px-3 py-3 text-right">
                                  {['Delivered', 'Partially Delivered'].includes(d.status) && (
                                    (() => {
                                      const existingInv = customerInvoices.filter(i => i.reference_id === d.id);
                                      const invoicedAmt = existingInv.reduce((sum, i) => sum + i.total_amount, 0);
                                      const totalOrderAmount = (selectedOrder.qty * selectedOrder.unit_price) - (selectedOrder.discount || 0) + (selectedOrder.shipping_cost || 0);
                                      const remaining = totalOrderAmount - invoicedAmt;
                                      
                                      if (remaining > 0) {
                                        return <button onClick={() => handleCreateInvoice(d, selectedOrder)} className="px-2 py-1 bg-brand-100 text-brand-700 rounded text-xs font-medium hover:bg-brand-200">Create Invoice</button>;
                                      } else {
                                        return <span className="text-xs text-green-600 font-medium">Invoiced</span>;
                                      }
                                    })()
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {activeDetailTab === 'cost' && (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-500">Kalkulasi Margin Kotor berdasarkan HPP barang yang sudah di-dispatch.</p>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <p className="text-sm text-slate-500 mb-1">Total Pendapatan Bersih</p>
                        <p className="text-2xl font-bold text-slate-900">Rp {total.toLocaleString('id-ID')}</p>
                      </div>
                      <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                        <p className="text-sm text-red-600 mb-1">Total HPP Terkirim</p>
                        <p className="text-2xl font-bold text-red-700">Rp {(selectedOrder.total_hpp || 0).toLocaleString('id-ID')}</p>
                      </div>
                    </div>

                    <div className="bg-sbs-green-50 p-4 rounded-lg border border-sbs-green-200 flex justify-between items-center">
                      <div>
                        <p className="text-sm text-sbs-green-700 font-medium">Gross Margin (Laba Kotor)</p>
                        <p className="text-xs text-sbs-green-600 mt-1">Belum dipotong biaya operasional.</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-sbs-green-800">Rp {(selectedOrder.gross_margin || 0).toLocaleString('id-ID')}</p>
                        <p className="text-sm font-bold text-sbs-green-700 mt-1">{(selectedOrder.gross_margin_percentage || 0).toFixed(2)} %</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeDetailTab === 'audit' && (
                  <div className="space-y-4">
                    {orderLogs.length === 0 ? (
                       <p className="text-sm text-center py-6 text-slate-400 border border-dashed rounded-lg">Belum ada history.</p>
                    ) : (
                      <div className="relative pl-4 border-l-2 border-slate-200 space-y-6">
                        {orderLogs.map((log, i) => (
                          <div key={i} className="relative">
                            <div className="absolute -left-[21px] bg-brand-500 h-3 w-3 rounded-full border-2 border-white"></div>
                            <p className="text-xs text-slate-500">{new Date(log.created_at).toLocaleString('id-ID')}</p>
                            <p className="text-sm font-medium text-slate-900 mt-1">{log.action}</p>
                            {log.notes && <p className="text-sm text-slate-600 italic mt-1">{log.notes}</p>}
                            <p className="text-xs text-slate-400 mt-1">Oleh: {log.user}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-5 pt-4 border-t">
                <button type="button" onClick={() => setIsDetailOpen(false)} className="w-full justify-center rounded-md bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-200">Tutup Detail</button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* CREATE DELIVERY MODAL */}
      <Modal isOpen={isDeliveryModalOpen} onClose={() => setIsDeliveryModalOpen(false)} title="Buat Delivery Order (DO)">
         <form onSubmit={handleSaveDelivery} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-sm font-medium text-slate-900">Tanggal Rencana Kirim</label>
                  <input type="date" required value={deliveryForm.scheduled_date} onChange={e => setDeliveryForm({...deliveryForm, scheduled_date: e.target.value})} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm" />
               </div>
               <div>
                  <label className="block text-sm font-medium text-slate-900">Customer</label>
                  <input type="text" readOnly value={deliveryForm.customer_name} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-500 bg-slate-50 ring-1 ring-inset ring-slate-300 sm:text-sm" />
               </div>
            </div>
            <div>
               <label className="block text-sm font-medium text-slate-900">Alamat Tujuan</label>
               <textarea rows={2} required value={deliveryForm.customer_address} onChange={e => setDeliveryForm({...deliveryForm, customer_address: e.target.value})} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-sm font-medium text-slate-900">Nama Sopir / PIC</label>
                  <input type="text" value={deliveryForm.driver} onChange={e => setDeliveryForm({...deliveryForm, driver: e.target.value})} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm" />
               </div>
               <div>
                  <label className="block text-sm font-medium text-slate-900">No. Kendaraan (Plat)</label>
                  <input type="text" value={deliveryForm.vehicle_number} onChange={e => setDeliveryForm({...deliveryForm, vehicle_number: e.target.value})} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm" />
               </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mt-4">
               <h4 className="text-sm font-medium text-slate-900 mb-3">Item yang akan dikirim</h4>
               <table className="min-w-full text-sm">
                  <thead>
                     <tr className="border-b"><th className="text-left pb-2">Item</th><th className="text-right pb-2">Qty Reserved</th><th className="text-right pb-2">Qty Kirim</th></tr>
                  </thead>
                  <tbody>
                     {deliveryForm.items.map((it:any, idx:number) => (
                        <tr key={idx}>
                           <td className="py-2">{getInventoryItemName(it.item_id)}</td>
                           <td className="py-2 text-right">{it.quantity}</td>
                           <td className="py-2 text-right">
                              <input type="number" min="1" max={it.quantity} required value={it.qty_to_deliver} onChange={e => {
                                 const newItems = [...deliveryForm.items];
                                 newItems[idx].qty_to_deliver = Number(e.target.value);
                                 setDeliveryForm({...deliveryForm, items: newItems});
                              }} className="w-20 rounded border-slate-300 text-right text-sm ml-auto" />
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
            
            <div className="mt-5 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
              <button type="submit" className="inline-flex w-full justify-center rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-500 sm:col-start-2">Buat Delivery</button>
              <button type="button" onClick={() => setIsDeliveryModalOpen(false)} className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-900 ring-1 ring-inset ring-slate-300 sm:col-start-1 sm:mt-0">Batal</button>
            </div>
         </form>
      </Modal>

    </div>
  );
}
