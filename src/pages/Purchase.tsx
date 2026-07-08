import { useState, useEffect } from 'react'; 
// import { db } from '../services/db';
import type { Supplier, SupplierCategory, PurchaseOrder, PurchaseOrderItem, Project, Item } from '../types';
import { getDataProvider } from '../providers';
import { useAuth } from '../contexts/AuthContext';
import { arApService } from '../services/arApService';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { Plus, Edit, Search, PackagePlus, AlertCircle, Trash2, RotateCcw, FileText } from 'lucide-react';
import { useTableSort } from '../hooks/useTableSort';
import SortIcon from '../components/SortIcon';
import toast from 'react-hot-toast';
import { confirmAlert } from '../components/ui/ConfirmAlert';
import { CurrencyInput } from '../components/ui/CurrencyInput';

const SUPPLIER_CATEGORIES: SupplierCategory[] = ['Ayam', 'Bahan Kandang', 'Bahan Pakan', 'Vitamin / Obat', 'Peralatan', 'Umum'];

export default function Purchase() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'supplier' | 'po'>('supplier');
  
  // Data State
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [poItemsAll, setPoItemsAll] = useState<PurchaseOrderItem[]>([]);
  const [supplierBills, setSupplierBills] = useState<any[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  
  // Modal States
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isPOModalOpen, setIsPOModalOpen] = useState(false);
  const [editingPOId, setEditingPOId] = useState<string | null>(null);
  const [isPOViewOnly, setIsPOViewOnly] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<SupplierCategory | 'All'>('All');
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);

  // Supplier Form
  const [supForm, setSupForm] = useState<Partial<Supplier>>({
    name: '', category: 'Ayam', phone: '', address: '', notes: '', is_active: true
  });

  // PO Form
  const [poForm, setPoForm] = useState<Partial<PurchaseOrder>>({
    supplier_id: '', project_id: '', date: new Date().toISOString().split('T')[0], shipping_cost: 0, notes: ''
  });
  const [poItems, setPoItems] = useState<Partial<PurchaseOrderItem>[]>([]);

  // Receive Form
  const [receivePO, setReceivePO] = useState<PurchaseOrder | null>(null);
  const [receiveItems, setReceiveItems] = useState<(PurchaseOrderItem & { qty_to_receive: number })[]>([]);
  const [receiveLocationId, setReceiveLocationId] = useState('');
  const [receiptResult, setReceiptResult] = useState<{receipt_id: string, items: any[]} | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const provider = getDataProvider();
    
    // Using generic repository for entities without explicit provider contracts yet
    const sups = await provider.getRepository<Supplier>('suppliers').list();
    const pos = await provider.getRepository<PurchaseOrder>('purchase_orders').list();
    const poItemsRaw = await provider.getRepository<any>('purchase_order_items').list();
    const poItems = poItemsRaw.map((i: any) => ({
      ...i,
      qty_ordered: i.quantity ?? i.qty_ordered,
      qty_received: i.received_quantity ?? i.qty_received,
    }));
    const bills = await provider.getRepository<any>('supplier_bills').list();
    
    const projs = await provider.getProjectRepository().listProjects();
    const itms = await provider.getItemRepository().listItems();
    const locs = await provider.getInventoryLocationRepository().listLocations();

    setSuppliers(sups);
    setPurchaseOrders(pos);
    setPoItemsAll(poItems);
    setSupplierBills(bills);
    setProjects(projs.filter((p: any) => p.status === 'Aktif'));
    setItems(itms);
    setLocations(locs);
  };

  // ---- Supplier Methods ----
  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const provider = getDataProvider();
      const payload = {
        name: supForm.name,
        phone: supForm.phone,
        address: supForm.address,
        active: supForm.is_active,
      };

      if (editingId) {
        await provider.getRepository<Supplier>('suppliers').update(editingId, payload);
      } else {
        const count = suppliers.length + 1;
        await provider.getRepository<Supplier>('suppliers').create({ 
          ...payload, 
          organization_id: profile?.organization_id,
          code: `SUP-${String(count).padStart(3, '0')}` 
        } as any);
      }
      setIsSupplierModalOpen(false);
      toast.success('Supplier berhasil disimpan');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan supplier');
      console.error(err);
    }
  };

  const handleDeleteSupplier = async (id: string, name: string) => {
    if (!(await confirmAlert(`Hapus supplier ${name}?`))) return;
    try {
      const provider = getDataProvider();
      await provider.getRepository<Supplier>('suppliers').delete(id);
      toast.success('Supplier berhasil dihapus');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus supplier');
    }
  };

  const toggleSupplierSelection = (id: string) => {
    setSelectedSupplierIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleAllSuppliers = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedSupplierIds(filteredSuppliers.map(s => s.id));
    else setSelectedSupplierIds([]);
  };

  const handleMassDeleteSupplier = async () => {
    if (!(await confirmAlert(`Hapus ${selectedSupplierIds.length} supplier terpilih?`))) return;
    try {
      const provider = getDataProvider();
      await Promise.all(selectedSupplierIds.map(id => provider.getRepository<Supplier>('suppliers').delete(id)));
      setSelectedSupplierIds([]);
      toast.success(`${selectedSupplierIds.length} supplier berhasil dihapus`);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus beberapa supplier');
    }
  };

  const openAddSupplier = () => {
    setEditingId(null);
    setSupForm({ name: '', category: 'Ayam', phone: '', address: '', notes: '', is_active: true });
    setIsSupplierModalOpen(true);
  };

  const openEditSupplier = (s: Supplier) => {
    setEditingId(s.id);
    setSupForm({ ...s, is_active: (s as any).active ?? true });
    setIsSupplierModalOpen(true);
  };

  // ---- PO Methods ----
  const openAddPO = () => {
    setEditingPOId(null);
    setIsPOViewOnly(false);
    setPoForm({ supplier_id: '', project_id: '', date: new Date().toISOString().split('T')[0], shipping_cost: 0, notes: '' });
    setPoItems([]);
    setIsPOModalOpen(true);
  };

  const openEditPO = (po: PurchaseOrder, viewOnly = false) => {
    setEditingPOId(po.id);
    setIsPOViewOnly(viewOnly);
    setPoForm({
      supplier_id: po.supplier_id,
      project_id: po.project_id,
      date: po.date,
      shipping_cost: po.shipping_cost,
      notes: po.notes
    });
    
    const itemsForPO = poItemsAll.filter(i => i.po_id === po.id);
    setPoItems(itemsForPO.map(i => ({
      item_id: i.item_id,
      qty_ordered: i.qty_ordered,
      unit_price: i.unit_price,
      discount: 0,
      subtotal: (i.qty_ordered * i.unit_price)
    })));
    setIsPOModalOpen(true);
  };

  const handleDeletePO = async (po: PurchaseOrder) => {
    if (po.status !== 'Ordered' && po.status !== 'Draft') {
      return toast.error('PO yang sudah diterima (sebagian/penuh) tidak dapat dihapus!');
    }
    
    const confirm = await confirmAlert(`Apakah Anda yakin ingin menghapus PO ${po.po_number}?`);
    if (!confirm) return;

    try {
      const provider = getDataProvider();
      await provider.getRepository('purchase_orders').delete(po.id);
      toast.success('PO berhasil dihapus');
      loadData();
    } catch (e: any) {
      toast.error('Gagal menghapus PO: ' + e.message);
    }
  };

  const addPOItemRow = () => {
    setPoItems([...poItems, { item_id: '', qty_ordered: 1, unit_price: 0, discount: 0, subtotal: 0 }]);
  };

  const updatePOItem = (index: number, field: keyof PurchaseOrderItem, value: any) => {
    const newItems = [...poItems];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Recalculate subtotal
    if (['qty_ordered', 'unit_price', 'discount'].includes(field)) {
      const qty = newItems[index].qty_ordered || 0;
      const price = newItems[index].unit_price || 0;
      const disc = newItems[index].discount || 0;
      newItems[index].subtotal = (qty * price) - disc;
    }
    setPoItems(newItems);
  };

  const removePOItemRow = (index: number) => {
    const newItems = [...poItems];
    newItems.splice(index, 1);
    setPoItems(newItems);
  };

  const getPOTotalAmount = () => {
    const itemsTotal = poItems.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    return itemsTotal + (poForm.shipping_cost || 0);
  };

  const handleSavePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poForm.supplier_id || !poForm.project_id) {
      toast.error('Supplier dan Project wajib dipilih!');
      return;
    }
    if (poItems.length === 0) {
      toast.error('Minimal 1 item barang harus ditambahkan!');
      return;
    }
    for (const item of poItems) {
      if (!item.item_id) return toast.error('Pilih barang untuk semua baris item!');
      if ((item.qty_ordered || 0) <= 0) return toast.error('Qty order harus lebih dari 0!');
      if ((item.unit_price || 0) < 0) return toast.error('Harga satuan tidak boleh negatif!');
    }

    const count = purchaseOrders.length + 1;
    const poNumber = `PO-${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2, '0')}-${String(count).padStart(3, '0')}`;
    
    try {
      const provider = getDataProvider();
      if (editingPOId) {
        // For simplicity, we delete existing items and recreate them via a custom call or just rely on the UI
        // Since we don't have a full update RPC, we will update the PO header and warn the user about items.
        // In a real app, we'd use an RPC to update PO + Items transactionally.
        await provider.getPurchaseOrderRepository().updatePurchaseOrder(editingPOId, {
          supplier_id: poForm.supplier_id,
          project_id: poForm.project_id,
          date: poForm.date as string,
          total_amount: getPOTotalAmount(),
          shipping_cost: poForm.shipping_cost || 0,
          notes: poForm.notes,
        });
        toast.success('PO berhasil diupdate! (Catatan: Update item PO saat ini belum didukung penuh)');
      } else {
        await provider.getPurchaseOrderRepository().createPurchaseOrder({
          organization_id: profile?.organization_id,
          po_number: poNumber,
          project_id: poForm.project_id,
          supplier_id: poForm.supplier_id,
          date: poForm.date as string,
          status: 'Ordered',
          total_amount: getPOTotalAmount(),
          shipping_cost: poForm.shipping_cost || 0,
          notes: poForm.notes,
          items: poItems as any
        } as any);
        toast.success('PO berhasil dibuat!');
      }
      setIsPOModalOpen(false);
      loadData();
    } catch (e: any) {
      toast.error('Gagal menyimpan PO: ' + e.message);
    }
  };

  // ---- Receive Methods ----
  const openReceivePO = (po: PurchaseOrder) => {
    const itemsForPO = poItemsAll.filter((i: any) => i.po_id === po.id);
    
    const mappedItems = itemsForPO.map((i: any) => ({
      ...i,
      qty_to_receive: 0 // default 0 to let user input manually
    }));

    setReceivePO(po);
    setReceiveItems(mappedItems);
    setReceiveLocationId('');
    setIsReceiveModalOpen(true);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReceiveSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    if (!receivePO) return;
    if (!receiveLocationId) return toast.error('Pilih lokasi / gudang penyimpanan barang!');

    let anyReceivedNow = false;

    // Validate first
    for (const item of receiveItems) {
      const remaining = item.qty_ordered - item.qty_received;
      if (item.qty_to_receive < 0) return toast.error('Qty terima tidak boleh negatif!');
      if (item.qty_to_receive > remaining) return toast.error(`Qty terima melebihi sisa untuk barang tertentu! (Max: ${remaining})`);
      if (item.qty_to_receive > 0) anyReceivedNow = true;
    }

    if (!anyReceivedNow) return toast.error('Minimal 1 barang harus diterima.');

    try {
      const provider = getDataProvider();
      const receiptRepo = provider.getPurchaseReceiptRepository();
      
      const itemsToReceive = receiveItems
        .filter(i => i.qty_to_receive > 0)
        .map(i => ({
          po_item_id: i.id,
          item_id: i.item_id,
          quantity_received: i.qty_to_receive,
          unit_cost: Math.max(0, i.unit_price - (i.discount || 0)),
          notes: ''
        }));

      // Simulate a receipt number
      const rcNumber = `RC-${Date.now()}`;

      const result = await receiptRepo.postPurchaseReceipt({
        organization_id: (receivePO as any).organization_id || '11111111-1111-1111-1111-111111111111',
        po_id: receivePO.id,
        receipt_number: rcNumber,
        receipt_date: new Date().toISOString().split('T')[0],
        location_id: receiveLocationId,
        project_id: receivePO.project_id,
        supplier_id: receivePO.supplier_id,
        notes: 'Penerimaan dari UI',
        items: itemsToReceive
      });

      setReceiptResult({
        receipt_id: result?.receipt_id || rcNumber,
        items: itemsToReceive.map(i => ({
          name: getItemName(i.item_id),
          qty: i.quantity_received
        }))
      });

      toast.success('Penerimaan barang berhasil diproses!');
      setIsReceiveModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error('Gagal memproses penerimaan barang: ' + err.message);
      return;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateBill = (po: PurchaseOrder) => {
    // Calculate total received value
    const itemsForPO = poItemsAll.filter(i => i.po_id === po.id);
    const totalReceivedValue = itemsForPO.reduce((sum, item) => sum + (item.qty_received * Math.max(0, item.unit_price - item.discount)), 0);
    
    // Calculate already billed
    const existingBills = supplierBills.filter(b => b.reference_id === po.id);
    const billedAmt = existingBills.reduce((sum, b) => sum + b.total_amount, 0);
    
    const remaining_billable = totalReceivedValue - billedAmt;
    
    if (remaining_billable <= 0) {
      toast.error("Sudah tidak ada tagihan tersisa untuk PO ini (berdasarkan qty received).");
      return;
    }
    
    try {
      arApService.createSupplierBill({
        organization_id: '00000000-0000-0000-0000-000000000000',
        supplier_id: po.supplier_id,
        project_id: po.project_id,
        bill_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
        total_amount: remaining_billable,
        purchase_order_id: po.id
      }, 'Admin');
      toast.success("Supplier Bill berhasil dibuat.");
      loadData();
    } catch (e: any) {
      toast.error("Gagal membuat Supplier Bill: " + e.message);
    }
  };

  // --- Render Helpers ---
  const filteredSuppliers = suppliers.filter(s => 
    (categoryFilter === 'All' || s.category === categoryFilter) &&
    (s.name.toLowerCase().includes(search.toLowerCase()) || s.code.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredPOs = purchaseOrders.filter(po => 
    po.po_number.toLowerCase().includes(search.toLowerCase())
  );

  const getSupplierName = (id: string) => suppliers.find(s => s.id === id)?.name || 'Unknown';
  const getProjectName = (id: string) => projects.find(p => p.id === id)?.name || 'Unknown';
  const getItemName = (id: string) => items.find(i => i.id === id)?.name || 'Unknown';
  const getItemUnit = (id: string) => items.find(i => i.id === id)?.unit || '';

  const { sortedData: sortedSuppliers, requestSort: sortSupplier, sortConfig: supplierSortConfig } = useTableSort(filteredSuppliers);
  const { sortedData: sortedPOs, requestSort: sortPO, sortConfig: poSortConfig } = useTableSort(filteredPOs, {
    supplier_id: (po) => getSupplierName(po.supplier_id),
    project_id: (po) => getProjectName(po.project_id)
  });

  const getSupplierName = (id: string) => suppliers.find(s => s.id === id)?.name || 'Unknown';
  const getProjectName = (id: string) => projects.find(p => p.id === id)?.name || 'Unknown';
  const getItemName = (id: string) => items.find(i => i.id === id)?.name || 'Unknown';
  const getItemUnit = (id: string) => items.find(i => i.id === id)?.unit || '';

  const getPOBadgeColor = (status: string) => {
    switch(status) {
      case 'Draft': return 'default';
      case 'Ordered': return 'warning';
      case 'Partial Received': return 'info';
      case 'Received': return 'success';
      case 'Cancelled': return 'error';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold leading-7 text-slate-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Pengadaan (Purchase)
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Pembelian material, bahan baku, dan peralatan dari supplier.
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'supplier' && selectedSupplierIds.length > 0 && (
            <button onClick={handleMassDeleteSupplier} className="inline-flex items-center justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500">
              <Trash2 className="-ml-0.5 mr-2 h-4 w-4" /> Hapus Terpilih ({selectedSupplierIds.length})
            </button>
          )}
          {activeTab === 'supplier' && (
            <button onClick={() => {
                setSelectedSupplierIds([]);
                loadData();
              }} className="inline-flex items-center justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50">
              <RotateCcw className="-ml-0.5 mr-2 h-4 w-4" /> Refresh
            </button>
          )}
          {activeTab === 'supplier' ? (
            <button
              onClick={openAddSupplier}
              data-testid="btn-add-supplier"
              className="inline-flex items-center gap-x-2 rounded-md bg-brand-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-500"
            >
              <Plus className="-ml-0.5 h-5 w-5" />
              Tambah Supplier
            </button>
          ) : (
            <button
              onClick={openAddPO}
              data-testid="btn-add-po"
              className="inline-flex items-center gap-x-2 rounded-md bg-brand-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-500"
            >
              <Plus className="-ml-0.5 h-5 w-5" />
              Buat PO Baru
            </button>
          )}
        </div>
      </div>

      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('supplier')}
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
              activeTab === 'supplier' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            Master Supplier
          </button>
          <button
            onClick={() => setActiveTab('po')}
            data-testid="tab-po"
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
              activeTab === 'po' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            Purchase Orders
          </button>
        </nav>
      </div>

      {receiptResult && (
        <div className="bg-green-50 border border-green-200 p-4 rounded-md my-4 relative" data-testid="inventory-impact-panel">
          <h3 className="text-green-800 font-bold mb-2">Penerimaan Berhasil (Inventory Impact)</h3>
          <p className="text-sm text-green-700 mb-1">Receipt Number: <strong>{receiptResult.receipt_id}</strong></p>
          <ul className="list-disc list-inside text-sm text-green-700 mb-2">
            {receiptResult.items.map((i, idx) => (
              <li key={idx}>Item: <strong>{i.name}</strong> | Qty Received: <strong>{i.qty}</strong></li>
            ))}
          </ul>
          <p className="text-sm text-green-700">Kartu stok dan inventory balance telah diupdate secara otomatis dengan source Purchase Receipt.</p>
          <button onClick={() => setReceiptResult(null)} className="absolute top-4 right-4 text-xs text-green-800 underline">Tutup</button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full rounded-md border-0 py-1.5 pl-10 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm sm:leading-6"
            placeholder={activeTab === 'supplier' ? "Cari nama atau kode supplier..." : "Cari nomor PO..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        {activeTab === 'supplier' && (
          <select
            className="block w-full sm:w-48 rounded-md border-0 py-1.5 pl-3 pr-10 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm sm:leading-6"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
          >
            <option value="All">Semua Kategori</option>
            {SUPPLIER_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        {activeTab === 'supplier' ? (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="py-3.5 pl-4 pr-3 text-left w-12">
                  <input type="checkbox" className="rounded border-slate-300 text-brand-600 focus:ring-brand-600" checked={filteredSuppliers.length > 0 && selectedSupplierIds.length === filteredSuppliers.length} onChange={toggleAllSuppliers} />
                </th>
                <th scope="col" onClick={() => sortSupplier('code')} className="cursor-pointer py-3.5 px-3 text-left text-sm font-semibold text-slate-900 hover:bg-slate-100">Kode <SortIcon columnKey="code" sortConfig={supplierSortConfig} /></th>
                <th scope="col" onClick={() => sortSupplier('name')} className="cursor-pointer px-3 py-3.5 text-left text-sm font-semibold text-slate-900 hover:bg-slate-100">Nama Supplier <SortIcon columnKey="name" sortConfig={supplierSortConfig} /></th>
                <th scope="col" onClick={() => sortSupplier('category')} className="cursor-pointer px-3 py-3.5 text-left text-sm font-semibold text-slate-900 hover:bg-slate-100">Kategori <SortIcon columnKey="category" sortConfig={supplierSortConfig} /></th>
                <th scope="col" onClick={() => sortSupplier('phone')} className="cursor-pointer px-3 py-3.5 text-left text-sm font-semibold text-slate-900 hover:bg-slate-100">Telepon <SortIcon columnKey="phone" sortConfig={supplierSortConfig} /></th>
                <th scope="col" onClick={() => sortSupplier('is_active')} className="cursor-pointer px-3 py-3.5 text-center text-sm font-semibold text-slate-900 hover:bg-slate-100">Status <SortIcon columnKey="is_active" sortConfig={supplierSortConfig} /></th>
                <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-slate-900">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {sortedSuppliers.map((s) => (
                <tr key={s.id} className={selectedSupplierIds.includes(s.id) ? 'bg-brand-50' : ''}>
                  <td className="whitespace-nowrap py-4 pl-4 pr-3">
                    <input type="checkbox" className="rounded border-slate-300 text-brand-600 focus:ring-brand-600" checked={selectedSupplierIds.includes(s.id)} onChange={() => toggleSupplierSelection(s.id)} />
                  </td>
                  <td className="whitespace-nowrap py-4 px-3 text-sm font-medium text-slate-900">{s.code}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-900 font-medium">{s.name}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500"><Badge variant="info">{s.category}</Badge></td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{s.phone || '-'}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-center">
                    <Badge variant={((s as any).active ?? s.is_active) ? 'success' : 'default'}>{((s as any).active ?? s.is_active) ? 'Aktif' : 'Nonaktif'}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-center">
                    <button onClick={() => openEditSupplier(s)} className="text-brand-600 hover:text-brand-900 mr-4" title="Edit Supplier"><Edit className="h-4 w-4 inline" /></button>
                    <button onClick={() => handleDeleteSupplier(s.id, s.name)} className="text-red-500 hover:text-red-700" title="Hapus Supplier"><Trash2 className="h-4 w-4 inline" /></button>
                  </td>
                </tr>
              ))}
              {sortedSuppliers.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-sm text-slate-500">Tidak ada supplier ditemukan.</td></tr>
              )}
            </tbody>
          </table>
        ) : (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" onClick={() => sortPO('po_number')} className="cursor-pointer py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-900 hover:bg-slate-100">Nomor PO <SortIcon columnKey="po_number" sortConfig={poSortConfig} /></th>
                <th scope="col" onClick={() => sortPO('date')} className="cursor-pointer px-3 py-3.5 text-left text-sm font-semibold text-slate-900 hover:bg-slate-100">Tanggal <SortIcon columnKey="date" sortConfig={poSortConfig} /></th>
                <th scope="col" onClick={() => sortPO('supplier_id')} className="cursor-pointer px-3 py-3.5 text-left text-sm font-semibold text-slate-900 hover:bg-slate-100">Supplier <SortIcon columnKey="supplier_id" sortConfig={poSortConfig} /></th>
                <th scope="col" onClick={() => sortPO('project_id')} className="cursor-pointer px-3 py-3.5 text-left text-sm font-semibold text-slate-900 hover:bg-slate-100">Project <SortIcon columnKey="project_id" sortConfig={poSortConfig} /></th>
                <th scope="col" onClick={() => sortPO('total_amount')} className="cursor-pointer px-3 py-3.5 text-right text-sm font-semibold text-slate-900 hover:bg-slate-100">Total (Rp) <SortIcon columnKey="total_amount" sortConfig={poSortConfig} /></th>
                <th scope="col" onClick={() => sortPO('status')} className="cursor-pointer px-3 py-3.5 text-center text-sm font-semibold text-slate-900 hover:bg-slate-100">Status <SortIcon columnKey="status" sortConfig={poSortConfig} /></th>
                <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {sortedPOs.map((po) => (
                <tr key={po.id}>
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-bold text-slate-900">{po.po_number}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{new Date(po.date || (po as any).po_date).toLocaleDateString('id-ID')}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-900">{getSupplierName(po.supplier_id)}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{getProjectName(po.project_id)}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-900 text-right font-medium">{po.total_amount.toLocaleString('id-ID')}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-center">
                    <Badge variant={getPOBadgeColor(po.status) as any}>{po.status}</Badge>
                  </td>
                  <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 flex gap-2 justify-end">
                    {(po.status === 'Ordered' || po.status === 'Partial Received' || po.status === 'Partially Received') && (
                      <button onClick={() => openReceivePO(po)} data-testid={`btn-receive-${po.po_number}`} className="inline-flex items-center gap-1 text-sbs-green-600 hover:text-sbs-green-800 border border-sbs-green-200 px-2 py-1 rounded-md text-xs">
                        <PackagePlus className="w-3 h-3" /> Receive
                      </button>
                    )}
                    {['Partial Received', 'Partially Received', 'Received', 'Fully Received'].includes(po.status) && (
                      (() => {
                        const itemsForPO = poItemsAll.filter(i => i.po_id === po.id);
                        const totalReceivedValue = itemsForPO.reduce((sum, item) => sum + (item.qty_received * Math.max(0, item.unit_price - item.discount)), 0);
                        const existingBills = supplierBills.filter(b => b.reference_id === po.id);
                        const billedAmt = existingBills.reduce((sum, b) => sum + b.total_amount, 0);
                        const remaining_billable = totalReceivedValue - billedAmt;
                        
                        if (remaining_billable > 0) {
                          return (
                            <button onClick={() => handleCreateBill(po)} className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-800 border border-brand-200 px-2 py-1 rounded-md text-xs">
                              <FileText className="w-3 h-3" /> Tagih
                            </button>
                          );
                        } else if (totalReceivedValue > 0) {
                          return <span className="text-xs text-green-600 font-medium self-center">Billed</span>;
                        }
                        return null;
                      })()
                    )}
                    
                    {/* View / Edit / Delete Actions */}
                    {po.status === 'Ordered' || po.status === 'Draft' ? (
                      <>
                        <button onClick={() => openEditPO(po, false)} className="text-blue-600 hover:text-blue-800 bg-blue-50 p-1.5 rounded-md" title="Edit PO">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeletePO(po)} className="text-red-600 hover:text-red-800 bg-red-50 p-1.5 rounded-md" title="Hapus PO">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <button onClick={() => openEditPO(po, true)} className="text-slate-600 hover:text-slate-800 bg-slate-50 p-1.5 rounded-md border border-slate-200" title="Lihat Detail PO">
                        <Search className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {sortedPOs.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-sm text-slate-500">Tidak ada PO ditemukan.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Supplier Modal */}
      <Modal isOpen={isSupplierModalOpen} onClose={() => setIsSupplierModalOpen(false)} title={editingId ? 'Edit Supplier' : 'Tambah Supplier'}>
        <form onSubmit={handleSaveSupplier} className="space-y-4">
          <div>
            <label className="block text-sm font-medium leading-6 text-slate-900">Nama Supplier</label>
            <input type="text" required value={supForm.name} onChange={e => setSupForm({...supForm, name: e.target.value})} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium leading-6 text-slate-900">Kategori</label>
            <select value={supForm.category} onChange={e => setSupForm({...supForm, category: e.target.value as any})} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm">
              {SUPPLIER_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium leading-6 text-slate-900">No. WhatsApp / Telepon</label>
            <input type="text" value={supForm.phone} onChange={e => setSupForm({...supForm, phone: e.target.value})} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium leading-6 text-slate-900">Alamat Lengkap</label>
            <textarea rows={3} value={supForm.address} onChange={e => setSupForm({...supForm, address: e.target.value})} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium leading-6 text-slate-900">Catatan</label>
            <textarea rows={2} value={supForm.notes} onChange={e => setSupForm({...supForm, notes: e.target.value})} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm" />
          </div>
          <div className="flex items-center gap-2 mt-4">
            <input type="checkbox" id="s_active" checked={supForm.is_active} onChange={e => setSupForm({...supForm, is_active: e.target.checked})} className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600" />
            <label htmlFor="s_active" className="text-sm text-slate-900">Supplier Aktif</label>
          </div>
          <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
            <button type="submit" className="inline-flex w-full justify-center rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-500 sm:col-start-2">Simpan</button>
            <button type="button" onClick={() => setIsSupplierModalOpen(false)} className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-900 ring-1 ring-inset ring-slate-300 sm:col-start-1 sm:mt-0">Batal</button>
          </div>
        </form>
      </Modal>

      {/* PO Modal */}
      <Modal isOpen={isPOModalOpen} onClose={() => setIsPOModalOpen(false)} title={isPOViewOnly ? "Detail Purchase Order" : (editingPOId ? "Edit Purchase Order" : "Buat Purchase Order Baru")} maxWidth="max-w-4xl">
        <form onSubmit={handleSavePO} className="space-y-4 max-h-[80vh] overflow-y-auto px-1 pb-4">
          <fieldset disabled={isPOViewOnly} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium leading-6 text-slate-900">Tanggal Order</label>
              <input type="date" required value={poForm.date} onChange={e => setPoForm({...poForm, date: e.target.value})} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium leading-6 text-slate-900">Supplier</label>
              <select required data-testid="po-supplier" value={poForm.supplier_id} onChange={e => setPoForm({...poForm, supplier_id: e.target.value})} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm">
                <option value="">-- Pilih Supplier --</option>
                {suppliers.filter(s => (s as any).active ?? s.is_active).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium leading-6 text-slate-900">Alokasi Project</label>
            <select required data-testid="po-project" value={poForm.project_id} onChange={e => setPoForm({...poForm, project_id: e.target.value})} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm">
              <option value="">-- Pilih Project --</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          
          <div className="mt-6 border-t border-slate-200 pt-4">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-sm font-medium text-slate-900">Daftar Barang (Item)</h4>
              {!isPOViewOnly && (
                <button type="button" data-testid="btn-add-po-item" onClick={addPOItemRow} className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-800">
                  <Plus className="w-4 h-4" /> Tambah Baris
                </button>
              )}
            </div>
            
            <div className="space-y-3">
              {poItems.map((item, index) => (
                <div key={index} className="flex gap-2 items-end bg-slate-50 p-3 rounded-md border border-slate-200 relative">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-700">Barang</label>
                    <select required data-testid="po-item-select" value={item.item_id} onChange={e => updatePOItem(index, 'item_id', e.target.value)} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-xs">
                      <option value="">- Pilih Barang -</option>
                      {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                    </select>
                  </div>
                  <div className="w-20">
                    <label className="block text-xs font-medium text-slate-700">Qty</label>
                    <input type="number" data-testid="po-item-qty" min="1" required value={item.qty_ordered} onChange={e => updatePOItem(index, 'qty_ordered', Number(e.target.value))} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-xs" />
                  </div>
                  <div className="w-32">
                    <label className="block text-xs font-medium text-slate-700">Harga Satuan</label>
                    <CurrencyInput  data-testid="po-item-price" min="0" required value={item.unit_price || ""} onChange={(val) => updatePOItem(index, 'unit_price', val)} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-xs" />
                  </div>
                  <div className="w-24">
                    <label className="block text-xs font-medium text-slate-700">Diskon</label>
                    <CurrencyInput  min="0" value={item.discount || ""} onChange={(val) => updatePOItem(index, 'discount', val)} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-xs" />
                  </div>
                  <div className="w-32">
                    <label className="block text-xs font-medium text-slate-700">Subtotal</label>
                    <div className="mt-1 py-1.5 text-xs font-medium text-slate-900 text-right">
                      {item.subtotal?.toLocaleString('id-ID')}
                    </div>
                  </div>
                  {!isPOViewOnly && (
                    <button type="button" onClick={() => removePOItemRow(index)} className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 hover:bg-red-200">
                      <AlertCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              {poItems.length === 0 && <p className="text-xs text-center text-slate-500 py-4">Belum ada barang ditambahkan.</p>}
            </div>
          </div>

          <div className="mt-4 border-t border-slate-200 pt-4 flex flex-col items-end gap-2">
            <div className="flex items-center gap-4 w-64">
              <span className="text-sm text-slate-500 flex-1">Ongkos Kirim:</span>
              <CurrencyInput  value={poForm.shipping_cost || ""} onChange={(val) => setPoForm({...poForm, shipping_cost: val})} className="w-32 rounded-md border-0 py-1 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm text-right" />
            </div>
            <div className="flex items-center gap-4 w-64 pt-2 border-t border-slate-200">
              <span className="text-sm font-bold text-slate-900 flex-1">Total PO:</span>
              <span className="text-lg font-bold text-brand-600 w-32 text-right">Rp {getPOTotalAmount().toLocaleString('id-ID')}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium leading-6 text-slate-900">Catatan Tambahan</label>
            <textarea rows={2} value={poForm.notes} onChange={e => setPoForm({...poForm, notes: e.target.value})} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm" />
          </div>

          </fieldset>

          <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
            {!isPOViewOnly && (
              <button type="submit" data-testid="btn-submit-po" className="inline-flex w-full justify-center rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-500 sm:col-start-2">
                {editingPOId ? "Update PO" : "Buat PO"}
              </button>
            )}
            <button type="button" onClick={() => setIsPOModalOpen(false)} className={`mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-900 ring-1 ring-inset ring-slate-300 sm:mt-0 ${isPOViewOnly ? 'col-span-2' : 'sm:col-start-1'}`}>
              {isPOViewOnly ? 'Tutup' : 'Batal'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Receive Modal */}
      <Modal isOpen={isReceiveModalOpen} onClose={() => setIsReceiveModalOpen(false)} title="Penerimaan Barang (Receive)">
        <form onSubmit={handleReceiveSave} className="space-y-4 max-h-[80vh] overflow-y-auto px-1 pb-4">
          <div className="bg-blue-50 p-3 rounded-md mb-4 border border-blue-100">
            <p className="text-sm text-blue-800">
              <strong>PO Number:</strong> {receivePO?.po_number}<br/>
              <strong>Supplier:</strong> {receivePO ? getSupplierName(receivePO.supplier_id) : ''}
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">Gudang Penerima</label>
            <select
              data-testid="receive-location"
              value={receiveLocationId}
              onChange={e => setReceiveLocationId(e.target.value)}
              className="block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm sm:leading-6"
              required
            >
              <option value="">-- Pilih Gudang --</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            {receiveItems.map((item, index) => {
              const remaining = item.qty_ordered - item.qty_received;
              const isComplete = remaining === 0;

              return (
                <div key={item.id} className={`flex gap-4 items-center p-3 rounded-md border ${isComplete ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{getItemName(item.item_id)}</p>
                    <p className="text-xs text-slate-500">Order: {item.qty_ordered} | Diterima: {item.qty_received} | Sisa: {remaining}</p>
                  </div>
                  {!isComplete ? (
                    <div className="w-32">
                      <label className="block text-xs font-medium text-slate-700">Terima Sekarang</label>
                      <div className="flex items-center gap-1 mt-1">
                        <input 
                          type="number" 
                          data-testid="receive-qty-input"
                          min="0" 
                          max={remaining}
                          value={item.qty_to_receive} 
                          onChange={e => {
                            const val = Number(e.target.value);
                            const newItems = [...receiveItems];
                            newItems[index].qty_to_receive = val;
                            setReceiveItems(newItems);
                          }} 
                          className="block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-xs text-center" 
                        />
                        <span className="text-xs text-slate-500 w-8">{getItemUnit(item.item_id)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="w-32 flex justify-center items-center">
                      <Badge variant="success">Selesai</Badge>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-3 pt-4 mt-6 border-t">
            <button type="button" onClick={() => setIsReceiveModalOpen(false)} className="px-4 py-2 text-sm text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">
              Batal
            </button>
            <button type="submit" data-testid="btn-submit-receive" disabled={isSubmitting} className="px-4 py-2 text-sm text-white bg-brand-600 rounded-md hover:bg-brand-700 disabled:opacity-50">
              {isSubmitting ? 'Menyimpan...' : 'Simpan Penerimaan'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
