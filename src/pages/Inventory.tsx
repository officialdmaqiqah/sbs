import { useState, useMemo, useEffect } from 'react'; 
import { db } from '../services/db';
import { stockOpnameService } from '../services/stockOpname';
import { costingService } from '../services/costing';
import type { StockOpname, StockOpnameItem } from '../types';
import { ListFilter, ArrowDownLeft, ArrowUpRight, Plus, AlertTriangle, FileText, PackageCheck, RotateCcw, Box, Trash2, Edit2 } from 'lucide-react';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useProject } from '../contexts/ProjectContext';
import { useItems } from '../hooks/useItems';
import { getDataProvider } from '../providers';
import { useProjects } from '../hooks/useProjects';
import { useInventoryLocations } from '../hooks/useInventoryLocations';
import { useInventoryMovements } from '../hooks/useInventoryMovements';
import { useInventoryBalances } from '../hooks/useInventoryBalances';
import { usePostInventoryTransaction } from '../hooks/usePostInventoryTransaction';
import { useCashBankMutations } from '../hooks/useCashBankMutations';
import { useCashBankAccounts } from '../hooks/useFinance';

export default function Inventory() {
  const { profile } = useAuth();
  
  // RLS route-level blocking
  if (!profile || ['INVESTOR', 'WORKER', 'GUEST'].includes(profile.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  const { activeProject } = useProject();
  const [activeTab, setActiveTab] = useState<'master' | 'kartu' | 'opname' | 'ayam' | 'bahan'>('kartu');
  const [projectFilter, setProjectFilter] = useState<string>(activeProject?.id || 'ALL');

  useEffect(() => {
    if (activeProject) {
      setProjectFilter(activeProject.id);
    }
  }, [activeProject]);

  // Master Data (Using Hooks)
  const { data: items } = useItems();
  const { data: projects } = useProjects();
  const { data: locations } = useInventoryLocations();
  
  // Legacy Data
  const [opnames, setOpnames] = useState<StockOpname[]>([]);
  const [opnameItems, setOpnameItems] = useState<StockOpnameItem[]>([]);

  // Roles (Mock)
  const mockRole = ['CEO_ADMIN'].includes(profile?.role || '') ? 'Admin' : ['FINANCE'].includes(profile?.role || '') ? 'Reviewer' : 'Operator';

  // Mutasi Manual State
  const { postTransaction, loading: postingTransaction } = usePostInventoryTransaction();
  const [isMutasiModalOpen, setIsMutasiModalOpen] = useState(false);

  // Add Item State
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState({ name: '', category: 'RAW_MATERIAL', unit: 'KG', price: 0 });
  const [savingItem, setSavingItem] = useState(false);

  // Kartu Stok State
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Movemet and Balance Hooks
  const queryFilters: any = {};
  if (selectedItemId) queryFilters.itemId = selectedItemId;
  if (projectFilter !== 'ALL') queryFilters.projectId = projectFilter;
  
  const { data: movements, refetch: refetchMovements } = useInventoryMovements(queryFilters);
  const { data: allBalances, refetch: refetchBalances } = useInventoryBalances(projectFilter !== 'ALL' ? { projectId: projectFilter } : undefined);

  // Cash / Finance hooks
  const { data: cashAccounts } = useCashBankAccounts();
  const { createMutation: createCashMutation } = useCashBankMutations();

  const [mutasiError, setMutasiError] = useState('');
  const [mutasiForm, setMutasiForm] = useState({
    projectId: '', locationId: '', itemId: '', date: new Date().toISOString().split('T')[0], direction: 'IN', quantity: '', unitCost: '', referenceNumber: '', notes: '', transactionId: '', isPurchase: false, cashAccountId: ''
  });



  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingItem(true);
    try {
      const repo = getDataProvider().getItemRepository();
      
      if (editingItemId) {
        await repo.updateItem(editingItemId, {
          name: itemForm.name,
          category: itemForm.category,
          unit: itemForm.unit,
          active: true
        });
      } else {
        const code = `ITM-${Date.now().toString().slice(-6)}`;
        await repo.createItem({
          organizationId: profile?.organization_id,
          name: itemForm.name,
          code,
          category: itemForm.category,
          unit: itemForm.unit,
          active: true
        });
      }
      setIsItemModalOpen(false);
      window.location.reload(); 
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingItem(false);
    }
  };

  const handleDeleteItem = async (id: string, name: string) => {
    if (!window.confirm(`Hapus barang ${name}?`)) return;
    try {
      const { error } = await supabase.from('items').delete().eq('id', id);
      if (error) throw error;
      window.location.reload();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus barang. Barang mungkin sudah digunakan dalam transaksi.');
    }
  };

  const handleEditItem = (item: any) => {
    setEditingItemId(item.id);
    setItemForm({
      name: item.name,
      category: item.category,
      unit: item.unit,
      price: item.sellingPrice || 0
    });
    setIsItemModalOpen(true);
  };

  const handleOpenAddItem = () => {
    setEditingItemId(null);
    setItemForm({ name: '', category: 'RAW_MATERIAL', unit: 'KG', price: 0 });
    setIsItemModalOpen(true);
  };

  // Stock Opname State
  const [isOpnameModalOpen, setIsOpnameModalOpen] = useState(false);
  const [opnameForm, setOpnameForm] = useState<Partial<StockOpname>>({
    project_id: '', location: '', date: new Date().toISOString().split('T')[0], notes: ''
  });
  
  // Detail Opname
  const [selectedOpnameId, setSelectedOpnameId] = useState<string>('');
  
  // Concurrency Warning State
  const [concurrencyWarning, setConcurrencyWarning] = useState<string>('');
  const [overrideNotes, setOverrideNotes] = useState('');

  useState(() => {
    // Initial legacy load
    setOpnames((db as any).getAll('stock_opnames') || []);
    setOpnameItems((db as any).getAll('stock_opname_items') || []);
  });

  const loadData = () => {
    setOpnames((db as any).getAll('stock_opnames') || []);
    setOpnameItems((db as any).getAll('stock_opname_items') || []);
  };

  const getProjectName = (id?: string) => {
    if (!id) return '-';
    return projects?.find(p => p.id === id)?.name || id;
  };
  const getItemName = (id: string) => items?.find(i => i.id === id)?.name || 'Unknown';
  
  const getCurrentStock = (itemId: string) => {
    return allBalances?.filter(b => b.item_id === itemId || b.itemId === itemId).reduce((sum, b) => sum + (b.quantity || 0), 0) || 0;
  };

  // --- KARTU STOK ---
  const filteredMovements = useMemo(() => {
    if (!movements) return [];
    return movements.filter((m: any) => {
      const mDate = m.movement_date || (m.created_at ? m.created_at.substring(0, 10) : '');
      if (startDate && mDate < startDate) return false;
      if (endDate && mDate > endDate) return false;
      return true;
    }).sort((a: any, b: any) => new Date(a.movement_date || a.created_at || 0).getTime() - new Date(b.movement_date || b.created_at || 0).getTime());
  }, [movements, startDate, endDate]);

  const totalIn = filteredMovements.filter((m: any) => m.direction === 'IN').reduce((sum, m) => sum + m.quantity, 0);
  const totalOut = filteredMovements.filter((m: any) => m.direction === 'OUT').reduce((sum, m) => sum + m.quantity, 0);
  const startingStock = filteredMovements.length > 0 ? (filteredMovements[0].stock_before !== undefined ? filteredMovements[0].stock_before : filteredMovements[0].stockBefore || 0) : 0;
  const endingStock = filteredMovements.length > 0 ? (filteredMovements[filteredMovements.length - 1].stock_after !== undefined ? filteredMovements[filteredMovements.length - 1].stock_after : filteredMovements[filteredMovements.length - 1].stockAfter || 0) : 0;

  // --- STOCK OPNAME ACTIONS ---
  const handleCreateOpname = (e: React.FormEvent) => {
    e.preventDefault();
    if (!opnameForm.project_id || !opnameForm.location) return alert('Lengkapi Project dan Lokasi Gudang');

    const count = opnames.length + 1;
    const docNum = `SO-${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2, '0')}-${String(count).padStart(3, '0')}`;
    
    // Create Header
    const newSO = (db as any).insert('stock_opnames', {
      ...opnameForm as any,
      document_number: docNum,
      pic: 'Operator1',
      reviewer: 'Reviewer1',
      status: 'Draft',
      total_surplus_value: 0,
      total_shortage_value: 0,
      net_adjustment_value: 0,
      costing_status: 'Valid'
    });

    // Take Snapshot for ALL items in this project/location (We will simplify and take all active items for now)
    items.forEach(item => {
      const snapStock = getCurrentStock(item.id);
      (db as any).insert('stock_opname_items', {
        opname_id: newSO.id,
        item_id: item.id,
        system_stock_snapshot: snapStock,
        physical_stock: snapStock,
        difference: 0,
        difference_type: 'Sama',
        avg_cost: costingService.getItemAverageCost(item.id),
        difference_value: 0
      });
    });

    stockOpnameService.logAudit(db, 'StockOpname', newSO.id, 'Create', 'Draft Opname dibuat', mockRole);

    setIsOpnameModalOpen(false);
    loadData();
    setSelectedOpnameId(newSO.id);
  };

  const updateOpnameItemPhysicalStock = (itemId: string, physical: number) => {
    const it = opnameItems.find(i => i.id === itemId);
    if (!it) return;
    
    if (physical < 0) physical = 0;
    
    const diff = physical - it.system_stock_snapshot;
    let diffType: 'Surplus' | 'Shortage' | 'Sama' = 'Sama';
    if (diff > 0) diffType = 'Surplus';
    else if (diff < 0) diffType = 'Shortage';

    const diffVal = Math.abs(diff) * it.avg_cost;

    (db as any).update('stock_opname_items', itemId, {
      physical_stock: physical,
      difference: diff,
      difference_type: diffType,
      difference_value: diffVal
    });
    
    loadData();
  };

  const updateOpnameItemReason = (itemId: string, reason: string) => {
    (db as any).update('stock_opname_items', itemId, { reason });
    loadData();
  };

  const handleMutasiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMutasiError('');
    if (!mutasiForm.projectId || !mutasiForm.locationId || !mutasiForm.itemId || !mutasiForm.quantity || Number(mutasiForm.quantity) <= 0) {
      setMutasiError('Data wajib belum lengkap atau jumlah tidak valid');
      return;
    }

    if (mutasiForm.direction === 'OUT') {
      const current = getCurrentStock(mutasiForm.itemId);
      if (Number(mutasiForm.quantity) > current) {
         setMutasiError(`Stok tidak mencukupi`);
         return;
      }
    }

    try {
      const txId = mutasiForm.transactionId || crypto.randomUUID();
      
      await postTransaction({
        projectId: mutasiForm.projectId === 'NULL' ? null : mutasiForm.projectId,
        locationId: mutasiForm.locationId,
        itemId: mutasiForm.itemId,
        date: mutasiForm.date,
        direction: mutasiForm.direction as any,
        quantity: Number(mutasiForm.quantity),
        unitCost: mutasiForm.unitCost ? Number(mutasiForm.unitCost) : undefined,
        referenceType: mutasiForm.isPurchase ? 'Pembelian' : 'Manual Adjustment',
        referenceNumber: mutasiForm.referenceNumber,
        notes: mutasiForm.notes,
        transactionId: txId
      });

      // If it's a purchase, deduct from cash bank
      if (mutasiForm.isPurchase && mutasiForm.cashAccountId && mutasiForm.direction === 'IN' && mutasiForm.unitCost) {
        const totalCost = Number(mutasiForm.quantity) * Number(mutasiForm.unitCost);
        await createCashMutation({
          mutation_date: mutasiForm.date,
          mutation_type: 'OUT',
          from_cash_bank_id: mutasiForm.cashAccountId,
          to_cash_bank_id: null,
          amount: totalCost,
          notes: `Pembelian Stok: ${getItemName(mutasiForm.itemId)} (${mutasiForm.quantity})`,
          project_id: mutasiForm.projectId === 'NULL' ? null : mutasiForm.projectId,
          reference_type: 'Pembelian Stok',
          reference_id: txId,
          source_module: 'Inventory'
        });
      }

      setIsMutasiModalOpen(false);
      setMutasiForm({ projectId: '', locationId: '', itemId: '', date: new Date().toISOString().split('T')[0], direction: 'IN', quantity: '', unitCost: '', referenceNumber: '', notes: '', transactionId: '', isPurchase: false, cashAccountId: '' });
      refetchMovements();
      refetchBalances();
    } catch (err: any) {
      setMutasiError(err.message || 'Gagal menyimpan mutasi');
    }
  };

  const handleAction = (action: string) => {
    if (!selectedOpnameId) return;
    const so = opnames.find(o => o.id === selectedOpnameId);
    if (!so) return;

    let res: { success: boolean, message?: string, requireOverride?: boolean } = { success: false };

    if (action === 'submit') res = stockOpnameService.submitStockOpname(so.id, mockRole);
    else if (action === 'approve') res = stockOpnameService.approveStockOpname(so.id, mockRole);
    else if (action === 'reject') {
      const reason = prompt('Alasan penolakan:');
      if (!reason) return;
      res = stockOpnameService.rejectStockOpname(so.id, reason, mockRole);
    }
    else if (action === 'post' || action === 'post_override') {
      const isOverride = action === 'post_override';
      res = stockOpnameService.postStockOpname(so.id, isOverride, overrideNotes, mockRole);
      if (res.requireOverride) {
        setConcurrencyWarning(res.message || 'Concurrency Warning');
        return; // wait for user choice
      }
    }
    else if (action === 'reverse') {
      const reason = prompt('Alasan reverse (min 10 karakter):');
      if (!reason) return;
      res = stockOpnameService.reverseStockAdjustment(so.id, reason, mockRole);
    }

    if (res.success) {
      setConcurrencyWarning('');
      loadData();
    } else {
      if (!res.requireOverride) alert(`Gagal: ${res.message}`);
    }
  };

  const openMutasiFor = (itemId: string, direction: 'IN' | 'OUT', notes: string = '', referenceType: string = '') => {
    setMutasiForm(prev => ({ 
      ...prev, 
      itemId, 
      direction, 
      notes, 
      referenceNumber: referenceType,
      isPurchase: direction === 'IN' && referenceType === 'Ayam Masuk' // auto check if purchasing chicken
    }));
    setIsMutasiModalOpen(true);
  };

  // --- RENDERS ---
  const selectedOpname = opnames.find(o => o.id === selectedOpnameId);
  const itemsForSelectedOpname = opnameItems.filter(i => i.opname_id === selectedOpnameId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold leading-7 text-slate-900">Inventory & Gudang</h2>
          <p className="mt-1 text-sm text-slate-500">Manajemen Kartu Stok dan Stock Opname Fisik.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-slate-700">Project Filter:</label>
          <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm font-bold">
            <option value="ALL">Semua Project</option>
            <option value="NULL">Non-Project (Global)</option>
            {projects?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          <button onClick={() => setActiveTab('master')} className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${activeTab === 'master' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'}`}>Master Inventory</button>
          <button onClick={() => setActiveTab('kartu')} className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${activeTab === 'kartu' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'}`}>Kartu Stok</button>
          <button onClick={() => setActiveTab('opname')} className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${activeTab === 'opname' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'}`}>Stock Opname</button>
          <button onClick={() => setActiveTab('ayam')} className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${activeTab === 'ayam' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'}`}>Tracking Ayam Petelur</button>
          <button onClick={() => setActiveTab('bahan')} className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${activeTab === 'bahan' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'}`}>Material Usage</button>
        </nav>
      </div>

      {/* MASTER INVENTORY TAB */}
      {activeTab === 'master' && (
        <div className="space-y-4">
          <div className="flex justify-end gap-2">
            <button onClick={() => refetchBalances()} className="inline-flex items-center justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50">
              <RotateCcw className="-ml-0.5 mr-2 h-4 w-4" /> Refresh Balance
            </button>
            <button onClick={() => setIsItemModalOpen(true)} className="inline-flex items-center justify-center rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-500">
              <Plus className="-ml-0.5 mr-2 h-4 w-4" /> Tambah Barang
            </button>
          </div>
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-900">Barang</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Kategori</th>
                <th className="px-3 py-3.5 text-center text-sm font-semibold text-slate-900">Stok Aktual</th>
                <th className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900">Avg Cost</th>
                <th className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900">Total Value</th>
                <th className="px-3 py-3.5 text-center text-sm font-semibold text-slate-900">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {items.map(item => {
                const stock = getCurrentStock(item.id);
                const avg = costingService.getItemAverageCost(item.id);
                return (
                <tr key={item.id}>
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-slate-900">{item.name}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500"><Badge variant="default">{item.category}</Badge></td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-900 font-bold text-center">{stock} <span className="font-normal text-slate-500">{item.unit}</span></td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500 text-right">Rp {avg.toLocaleString('id-ID')}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-slate-900 text-right">Rp {(stock * avg).toLocaleString('id-ID')}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-center">
                    <button onClick={() => handleEditItem(item)} className="text-blue-500 hover:text-blue-700 mr-3" title="Edit Barang">
                      <Edit2 className="h-4 w-4 mx-auto" />
                    </button>
                    <button onClick={() => handleDeleteItem(item.id, item.name)} className="text-red-500 hover:text-red-700" title="Hapus Barang">
                      <Trash2 className="h-4 w-4 mx-auto" />
                    </button>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
        </div>
      )}

      {/* KARTU STOK TAB */}
      {activeTab === 'kartu' && (
        <>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-grow">
                <div>
                  <label className="block text-sm font-medium leading-6 text-slate-900">Pilih Barang</label>
                  <select data-testid="kartu-item-select" value={selectedItemId} onChange={e => setSelectedItemId(e.target.value)} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm">
                    <option value="">-- Pilih Barang --</option>
                    {items?.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                  </select>
                </div>
                <div><label className="block text-sm font-medium leading-6 text-slate-900">Dari Tanggal</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 sm:text-sm" /></div>
                <div><label className="block text-sm font-medium leading-6 text-slate-900">Sampai Tanggal</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 sm:text-sm" /></div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => refetchMovements()} className="inline-flex items-center justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50">
                  <RotateCcw className="h-4 w-4 mr-2" /> Refresh
                </button>
                {['CEO_ADMIN', 'WAREHOUSE'].includes(profile?.role || '') && (
                  <button onClick={() => setIsMutasiModalOpen(true)} className="inline-flex items-center justify-center rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">
                    <Plus className="h-4 w-4 mr-2" /> Mutasi Manual
                  </button>
                )}
              </div>
            </div>
          </div>
          {selectedItemId ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col items-center justify-center"><p className="text-sm font-medium text-slate-500">Stok Awal</p><p data-testid="balance-stok-awal" className="text-2xl font-bold text-slate-900">{startingStock}</p></div>
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col items-center justify-center"><p className="text-sm font-medium text-sbs-green-600 flex items-center gap-1"><ArrowDownLeft className="w-4 h-4"/> Total Masuk</p><p data-testid="balance-total-in" className="text-2xl font-bold text-sbs-green-700">{totalIn}</p></div>
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col items-center justify-center"><p className="text-sm font-medium text-red-600 flex items-center gap-1"><ArrowUpRight className="w-4 h-4"/> Total Keluar</p><p data-testid="balance-total-out" className="text-2xl font-bold text-red-700">{totalOut}</p></div>
                <div className="bg-brand-50 p-4 rounded-lg border border-brand-200 shadow-sm flex flex-col items-center justify-center"><p className="text-sm font-medium text-brand-700">Stok Akhir</p><p data-testid="balance-stok-akhir" className="text-2xl font-bold text-brand-900">{endingStock}</p></div>
              </div>
              <div className="table-wrapper overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="table-header">
                    <tr>
                      <th className="py-3.5 pl-4 text-left">Waktu</th>
                      <th className="px-3 py-3.5 text-left">No. Referensi</th>
                      <th className="px-3 py-3.5 text-left">Tipe Mutasi</th>
                      <th className="px-3 py-3.5 text-center">Awal</th>
                      <th className="px-3 py-3.5 text-center text-emerald-600">IN</th>
                      <th className="px-3 py-3.5 text-center text-rose-600">OUT</th>
                      <th className="px-3 py-3.5 text-center">Akhir</th>
                      <th className="px-3 py-3.5 text-right">Cost/Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {filteredMovements.map(m => (
                      <tr key={m.id} className="table-row-hover">
                        <td className="whitespace-nowrap py-4 pl-4 text-sm text-slate-500">{new Date(m.created_at || m.createdAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-900 font-bold">{m.reference_number || m.referenceNumber || '-'}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-900">
                          <Badge variant={m.direction === 'IN' ? 'success' : 'danger'}>{m.movement_type || m.movementType || m.referenceType || 'Manual'}</Badge>
                          {m.notes && <p className="text-xs text-slate-500 mt-1 truncate max-w-xs">{m.notes}</p>}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500 text-center">{m.stock_before !== undefined ? m.stock_before : m.stockBefore}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm font-bold text-sbs-green-600 text-center">{m.direction === 'IN' ? `+${m.quantity}` : '-'}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm font-bold text-red-600 text-center">{m.direction === 'OUT' ? `-${m.quantity}` : '-'}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-900 text-center font-bold">{m.stock_after !== undefined ? m.stock_after : m.stockAfter}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500 text-right">{(m.unit_cost !== undefined ? m.unit_cost : m.unitCost)?.toLocaleString('id-ID')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-12 flex flex-col items-center text-center text-slate-500"><ListFilter className="w-12 h-12 text-slate-300 mb-4" /><p>Silakan pilih barang terlebih dahulu untuk melihat Kartu Stok.</p></div>
          )}
        </>
      )}

      {/* STOCK OPNAME TAB */}
      {activeTab === 'opname' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-1">
            <button onClick={() => setIsOpnameModalOpen(true)} className="w-full mb-4 inline-flex items-center justify-center gap-x-2 rounded-md bg-brand-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-500">
              <Plus className="w-5 h-5" /> Buat Stock Opname
            </button>
            <div className="bg-white rounded-lg border border-slate-200 p-2 space-y-1">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-2 py-2 mb-1">Dokumen Opname</h3>
              {opnames.map(so => (
                <button key={so.id} onClick={() => { setSelectedOpnameId(so.id); setConcurrencyWarning(''); }} className={`w-full text-left px-3 py-2.5 rounded-md text-sm flex flex-col ${selectedOpnameId === so.id ? 'bg-brand-50 text-brand-900 ring-1 ring-brand-600' : 'text-slate-700 hover:bg-slate-50'}`}>
                  <div className="flex justify-between items-center w-full">
                    <span className="font-bold">{so.document_number}</span>
                    <Badge variant={['Posted', 'Approved'].includes(so.status) ? 'success' : ['Rejected','Cancelled','Reversed'].includes(so.status) ? 'danger' : 'warning'}>{so.status}</Badge>
                  </div>
                  <span className="text-xs text-slate-500 mt-1">{new Date(so.date).toLocaleDateString('id-ID')}</span>
                </button>
              ))}
              {opnames.length === 0 && <p className="text-xs text-center text-slate-500 py-4">Belum ada dokumen.</p>}
            </div>
          </div>
          <div className="md:col-span-3">
            {selectedOpname ? (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                      <Box className="w-5 h-5 text-brand-600"/> {selectedOpname.document_number}
                      <Badge variant="default" className="ml-2">{selectedOpname.status}</Badge>
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">Project: {getProjectName(selectedOpname.project_id)} | Lokasi: {selectedOpname.location}</p>
                  </div>
                  <div className="flex gap-2">
                    {/* Role-based actions */}
                    {(selectedOpname.status === 'Draft' || selectedOpname.status === 'In Progress') && mockRole === 'Operator' && (
                      <button onClick={() => handleAction('submit')} className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-blue-500 flex items-center gap-1"><PackageCheck className="w-4 h-4"/> Submit</button>
                    )}
                    {selectedOpname.status === 'Submitted' && mockRole === 'Reviewer' && (
                      <>
                        <button onClick={() => handleAction('reject')} className="bg-red-100 text-red-700 px-3 py-1.5 rounded-md text-sm font-medium hover:bg-red-200">Tolak</button>
                        <button onClick={() => handleAction('approve')} className="bg-sbs-green-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-sbs-green-500 flex items-center gap-1"><PackageCheck className="w-4 h-4"/> Setujui</button>
                      </>
                    )}
                    {selectedOpname.status === 'Approved' && mockRole === 'Admin' && (
                      <button onClick={() => handleAction('post')} className="bg-brand-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-brand-500 flex items-center gap-1"><FileText className="w-4 h-4"/> Posting Adjustment</button>
                    )}
                    {selectedOpname.status === 'Posted' && mockRole === 'Admin' && (
                      <button onClick={() => handleAction('reverse')} className="text-red-600 hover:text-red-800 px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1"><RotateCcw className="w-4 h-4"/> Reverse</button>
                    )}
                  </div>
                </div>

                {concurrencyWarning && (
                  <div className="p-4 bg-red-50 border-b border-red-200 flex flex-col gap-3">
                    <p className="text-sm font-bold text-red-800 flex items-center gap-2"><AlertTriangle className="w-5 h-5"/> {concurrencyWarning}</p>
                    <p className="text-xs text-red-700">Sistem mendeteksi ada mutasi masuk/keluar setelah Stock Opname ini dibuat (Snapshot berbeda dengan Stok Saat Ini). Memposting dokumen ini akan memaksa "Stok Saat Ini" menjadi sama persis dengan "Stok Fisik" hasil opname.</p>
                    <div className="flex gap-2 items-center">
                      <input type="text" placeholder="Catatan Override..." value={overrideNotes} onChange={e=>setOverrideNotes(e.target.value)} className="block flex-1 rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 sm:text-sm" />
                      <button onClick={() => handleAction('post_override')} className="bg-red-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-red-700">Posting dengan Override</button>
                      <button onClick={() => setConcurrencyWarning('')} className="bg-white text-slate-700 px-3 py-1.5 rounded-md border border-slate-300 text-sm font-medium hover:bg-slate-50">Batal</button>
                    </div>
                  </div>
                )}

                <div className="table-wrapper overflow-x-auto mt-4">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="table-header">
                      <tr>
                        <th className="py-2 pl-4 text-left">Barang</th>
                        <th className="px-2 py-2 text-center">Stok Snap</th>
                        <th className="px-2 py-2 text-center text-brand-600 bg-brand-50 border-x border-brand-100">Fisik (Input)</th>
                        <th className="px-2 py-2 text-center">Selisih</th>
                        <th className="px-2 py-2 text-left w-1/4">Alasan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {itemsForSelectedOpname.map(item => {
                        const canEdit = ['Draft', 'In Progress'].includes(selectedOpname.status) && mockRole === 'Operator';
                        return (
                        <tr key={item.id} className={`${item.difference !== 0 ? 'bg-amber-50/30' : ''} table-row-hover`}>
                          <td className="whitespace-nowrap py-3 pl-4 text-sm font-bold text-slate-800">{getItemName(item.item_id)}</td>
                          <td className="whitespace-nowrap px-2 py-3 text-sm text-slate-500 text-center font-mono">{item.system_stock_snapshot}</td>
                          <td className="whitespace-nowrap px-2 py-3 text-sm text-center bg-brand-50/50 border-x border-brand-50">
                            <input 
                              type="number" min="0" disabled={!canEdit} value={item.physical_stock}
                              onChange={(e) => updateOpnameItemPhysicalStock(item.id, Number(e.target.value))}
                              className="w-20 text-center rounded-md border-0 py-1 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm font-bold disabled:bg-transparent disabled:ring-0 disabled:text-slate-900"
                            />
                          </td>
                          <td className="whitespace-nowrap px-2 py-3 text-sm text-center font-bold">
                            {item.difference > 0 ? <span className="text-sbs-green-600">+{item.difference} (Surplus)</span> : item.difference < 0 ? <span className="text-red-600">{item.difference} (Shortage)</span> : <span className="text-slate-400">0</span>}
                          </td>
                          <td className="whitespace-nowrap px-2 py-3 pr-4">
                            {item.difference !== 0 ? (
                              <input type="text" placeholder="Wajib diisi..." disabled={!canEdit} value={item.reason || ''} onChange={(e) => updateOpnameItemReason(item.id, e.target.value)} className="w-full rounded-md border-0 py-1 px-2 text-slate-900 ring-1 ring-inset ring-amber-300 focus:ring-2 focus:ring-amber-600 sm:text-xs disabled:bg-transparent disabled:ring-0" />
                            ) : (
                              <span className="text-xs text-slate-400">-</span>
                            )}
                          </td>
                        </tr>
                      )})}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-12 flex flex-col items-center text-center text-slate-500"><Box className="w-12 h-12 text-slate-300 mb-4" /><p>Pilih dokumen Stock Opname di sebelah kiri.</p></div>
            )}
          </div>
        </div>
      )}

      {/* AYAM PETELUR TAB */}
      {activeTab === 'ayam' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-slate-200">
            <div>
              <h3 className="font-bold text-lg text-slate-900">Tracking Ayam Petelur</h3>
              <p className="text-sm text-slate-500 mt-1">Monitoring populasi ayam hidup. Klik tombol aksi untuk mencatat mutasi ayam.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items?.filter(i => i.category === 'Ayam Petelur').map(item => {
              const stock = getCurrentStock(item.id);
              return (
                <div key={item.id} className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="font-bold text-slate-900 text-lg">{item.name}</h4>
                    <Badge variant={stock > 0 ? 'success' : 'danger'}>{stock} Ekor</Badge>
                  </div>
                  <div className="flex-grow"></div>
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100">
                    <button onClick={() => openMutasiFor(item.id, 'IN', '', 'Ayam Masuk')} className="text-xs font-semibold py-2 bg-sbs-green-50 text-sbs-green-700 rounded hover:bg-sbs-green-100">+ Masuk / Beli</button>
                    <button onClick={() => openMutasiFor(item.id, 'OUT', 'Ayam Terjual', 'Ayam Terjual')} className="text-xs font-semibold py-2 bg-blue-50 text-blue-700 rounded hover:bg-blue-100">- Terjual</button>
                    <button onClick={() => openMutasiFor(item.id, 'OUT', 'Ayam Mati', 'Ayam Mati')} className="text-xs font-semibold py-2 bg-red-50 text-red-700 rounded hover:bg-red-100">- Mati</button>
                    <button onClick={() => openMutasiFor(item.id, 'OUT', 'Ayam Sakit / Afkir', 'Ayam Sakit')} className="text-xs font-semibold py-2 bg-amber-50 text-amber-700 rounded hover:bg-amber-100">- Sakit/Afkir</button>
                  </div>
                </div>
              )
            })}
            {items?.filter(i => i.category === 'Ayam Petelur').length === 0 && (
              <div className="col-span-full bg-slate-50 border border-slate-200 rounded-lg p-12 flex flex-col items-center text-center text-slate-500"><Box className="w-12 h-12 text-slate-300 mb-4" /><p>Belum ada Master Barang dengan kategori 'Ayam Petelur'.</p></div>
            )}
          </div>
        </div>
      )}

      {/* MATERIAL USAGE TAB */}
      {activeTab === 'bahan' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-slate-200">
            <div>
              <h3 className="font-bold text-lg text-slate-900">Pemakaian Bahan & Material</h3>
              <p className="text-sm text-slate-500 mt-1">Pencatatan pemakaian bahan untuk produksi (Pakan & Kandang).</p>
            </div>
            <div className="bg-amber-50 text-amber-800 text-xs px-3 py-1.5 rounded border border-amber-200">
              <strong>Info:</strong> Pencatatan hasil produksi barang jadi akan disempurnakan di fase selanjutnya. Saat ini fokus pada pemotongan stok bahan baku.
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-900">Nama Bahan</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Kategori</th>
                  <th className="px-3 py-3.5 text-center text-sm font-semibold text-slate-900">Stok Tersedia</th>
                  <th className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900">Aksi Pemakaian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {items?.filter(i => ['Bahan Kandang', 'Bahan Pakan'].includes(i.category)).map(item => {
                  const stock = getCurrentStock(item.id);
                  return (
                  <tr key={item.id}>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-slate-900">{item.name}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500"><Badge variant="default">{item.category}</Badge></td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-900 font-bold text-center">{stock} <span className="font-normal text-slate-500">{item.unit}</span></td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-right space-x-2">
                      <button onClick={() => openMutasiFor(item.id, 'OUT', 'Dipakai Produksi Kandang', 'Bahan Dipakai Produksi Kandang')} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded font-medium border border-slate-300">
                        Pakai (Kandang)
                      </button>
                      <button onClick={() => openMutasiFor(item.id, 'OUT', 'Dipakai Racik Pakan', 'Bahan Dipakai Racik Pakan')} className="text-xs bg-brand-50 hover:bg-brand-100 text-brand-700 px-3 py-1.5 rounded font-medium border border-brand-200">
                        Pakai (Pakan)
                      </button>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE OPNAME MODAL */}
      <Modal isOpen={isOpnameModalOpen} onClose={() => setIsOpnameModalOpen(false)} title="Buat Stock Opname Baru">
        <form onSubmit={handleCreateOpname} className="space-y-4">
          <div>
            <label className="block text-sm font-medium leading-6 text-slate-900">Project</label>
            <select required value={opnameForm.project_id} onChange={e => setOpnameForm({...opnameForm, project_id: e.target.value})} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm">
              <option value="">- Pilih Project -</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium leading-6 text-slate-900">Lokasi Gudang</label>
            <input type="text" required value={opnameForm.location} onChange={e => setOpnameForm({...opnameForm, location: e.target.value})} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 sm:text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium leading-6 text-slate-900">Tanggal Target Opname</label>
            <input type="date" required value={opnameForm.date} onChange={e => setOpnameForm({...opnameForm, date: e.target.value})} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 sm:text-sm" />
          </div>
          <div className="bg-blue-50 p-3 rounded-md text-sm text-blue-800">
            <p><strong>Perhatian:</strong> Saat dokumen dibuat, sistem akan mengambil *Snapshot* seluruh stok saat ini untuk dikunci dan dijadikan dasar perbandingan (Stok Sistem).</p>
          </div>
          <div className="mt-5 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
            <button type="submit" className="inline-flex w-full justify-center rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-500 sm:col-start-2">Buat Draft & Snapshot</button>
            <button type="button" onClick={() => setIsOpnameModalOpen(false)} className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-900 ring-1 ring-inset ring-slate-300 sm:col-start-1 sm:mt-0">Batal</button>
          </div>
        </form>
      </Modal>

      {/* MUTASI MANUAL MODAL */}
      <Modal isOpen={isMutasiModalOpen} onClose={() => setIsMutasiModalOpen(false)} title="Mutasi Stok Manual">
        <form onSubmit={handleMutasiSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium leading-6 text-slate-900">Project</label>
              <select data-testid="mutasi-project" required value={mutasiForm.projectId} onChange={e => setMutasiForm({...mutasiForm, projectId: e.target.value})} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm">
                <option value="">- Pilih Project -</option>
                {projects?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium leading-6 text-slate-900">Lokasi Gudang</label>
              <select data-testid="mutasi-location" required value={mutasiForm.locationId} onChange={e => setMutasiForm({...mutasiForm, locationId: e.target.value})} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm">
                <option value="">- Pilih Lokasi -</option>
                {locations?.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium leading-6 text-slate-900">Barang</label>
            <select data-testid="mutasi-item" required value={mutasiForm.itemId} onChange={e => setMutasiForm({...mutasiForm, itemId: e.target.value})} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm">
              <option value="">- Pilih Barang -</option>
              {items?.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium leading-6 text-slate-900">Tanggal Mutasi</label>
              <input type="date" required value={mutasiForm.date} onChange={e => setMutasiForm({...mutasiForm, date: e.target.value})} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 sm:text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium leading-6 text-slate-900">Arah Mutasi (Direction)</label>
              <select data-testid="mutasi-direction" required value={mutasiForm.direction} onChange={e => setMutasiForm({...mutasiForm, direction: e.target.value})} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm font-bold">
                <option value="IN">Masuk (IN)</option>
                <option value="OUT">Keluar (OUT)</option>
              </select>
            </div>
          </div>
          {mutasiForm.direction === 'IN' && (
            <div className="bg-slate-50 p-3 rounded-md border border-slate-200">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={mutasiForm.isPurchase} onChange={(e) => setMutasiForm({...mutasiForm, isPurchase: e.target.checked})} className="rounded text-brand-600 focus:ring-brand-600" />
                <span className="text-sm font-medium text-slate-900">Ini adalah Pembelian (Potong Kas)</span>
              </label>
              {mutasiForm.isPurchase && (
                <div className="mt-3">
                  <label className="block text-xs font-bold leading-6 text-slate-900">Sumber Kas / Bank</label>
                  <select required value={mutasiForm.cashAccountId} onChange={(e) => setMutasiForm({...mutasiForm, cashAccountId: e.target.value})} className="mt-1 block w-full rounded-md border-0 py-1 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-xs">
                    <option value="">- Pilih Kas/Bank -</option>
                    {cashAccounts?.map(a => <option key={a.id} value={a.id}>{a.account_name} (Rp {Number(a.balance || 0).toLocaleString('id-ID')})</option>)}
                  </select>
                </div>
              )}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium leading-6 text-slate-900">Kuantitas (Quantity)</label>
              <input data-testid="mutasi-quantity" type="number" min="0" step="0.01" required value={mutasiForm.quantity} onChange={e => setMutasiForm({...mutasiForm, quantity: e.target.value})} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 sm:text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium leading-6 text-slate-900">Harga Satuan (Opsional)</label>
              <input data-testid="mutasi-unit-cost" type="number" min="0" step="0.01" value={mutasiForm.unitCost} onChange={e => setMutasiForm({...mutasiForm, unitCost: e.target.value})} disabled={mutasiForm.direction === 'OUT'} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 sm:text-sm disabled:bg-slate-100 disabled:text-slate-400" placeholder={mutasiForm.direction === 'OUT' ? 'Auto calculated' : '0.00'} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium leading-6 text-slate-900">Nomor Referensi</label>
            <input data-testid="mutasi-reference" type="text" value={mutasiForm.referenceNumber} onChange={e => setMutasiForm({...mutasiForm, referenceNumber: e.target.value})} placeholder="Opsional" className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 sm:text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium leading-6 text-slate-900">Catatan</label>
            <textarea data-testid="mutasi-notes" rows={2} value={mutasiForm.notes} onChange={e => setMutasiForm({...mutasiForm, notes: e.target.value})} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 sm:text-sm" />
          </div>
          
          {mockRole === 'Admin' && (
            <div className="bg-red-50 p-3 rounded-md border border-red-200">
              <label className="block text-xs font-bold leading-6 text-red-900">Advanced Override: Transaction ID</label>
              <input data-testid="mutasi-tx-id" type="text" value={mutasiForm.transactionId} onChange={e => setMutasiForm({...mutasiForm, transactionId: e.target.value})} placeholder="Biarkan kosong untuk auto-generate UUID" className="mt-1 block w-full rounded-md border-0 py-1 text-slate-900 ring-1 ring-inset ring-slate-300 sm:text-xs" />
            </div>
          )}

          {mutasiError && (
            <div data-testid="mutasi-error" className="bg-red-50 p-3 rounded-md text-sm text-red-800 border border-red-200">
              <AlertTriangle className="inline-block w-4 h-4 mr-2" />
              {mutasiError}
            </div>
          )}

          <div className="mt-5 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
            <button data-testid="mutasi-submit" type="submit" disabled={postingTransaction} className="inline-flex w-full justify-center rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-500 sm:col-start-2 disabled:bg-brand-400 disabled:cursor-not-allowed">
              {postingTransaction ? 'Memproses...' : 'Simpan Mutasi'}
            </button>
            <button type="button" onClick={() => setIsMutasiModalOpen(false)} disabled={postingTransaction} className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-900 ring-1 ring-inset ring-slate-300 sm:col-start-1 sm:mt-0 disabled:bg-slate-100 disabled:cursor-not-allowed">Batal</button>
          </div>
        </form>
      </Modal>

      {/* ADD / EDIT ITEM MODAL */}
      <Modal isOpen={isItemModalOpen} onClose={() => setIsItemModalOpen(false)} title={editingItemId ? "Edit Barang Master" : "Tambah Barang Master"}>
        <form onSubmit={handleSaveItem} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">Nama Barang</label>
            <input required type="text" className="w-full border rounded-md px-3 py-2" value={itemForm.name} onChange={e => setItemForm({...itemForm, name: e.target.value})} placeholder="Misal: Kayu Balok, Paku 5cm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">Kategori</label>
              <select className="w-full border rounded-md px-3 py-2" value={itemForm.category} onChange={e => setItemForm({...itemForm, category: e.target.value})}>
                <option value="RAW_MATERIAL">Bahan Baku (Material)</option>
                <option value="PACKAGING">Packaging / Kemasan</option>
                <option value="CONSUMABLE">Barang Habis Pakai</option>
                <option value="FINISHED_GOODS">Barang Jadi / Produk</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">Satuan (UOM)</label>
              <input required type="text" className="w-full border rounded-md px-3 py-2" value={itemForm.unit} onChange={e => setItemForm({...itemForm, unit: e.target.value})} placeholder="Misal: Batang, Kg, Sak" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button type="button" onClick={() => setIsItemModalOpen(false)} className="px-4 py-2 border rounded-md">Batal</button>
            <button type="submit" disabled={savingItem} className="px-4 py-2 bg-brand-600 text-white rounded-md flex items-center">
              {savingItem ? 'Menyimpan...' : 'Simpan Barang'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
