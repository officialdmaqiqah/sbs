 import { useState, useEffect } from 'react'; 
import { db } from '../services/db';
import { feedProductionService } from '../services/feedProduction';
import { costingService } from '../services/costing';
import type { FeedRecipe, FeedRecipeItem, FeedProductionOrder, FeedProductionOrderItem, Project, Item, InventoryMovement } from '../types';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { Plus, Edit, Search, AlertTriangle, RotateCcw, Save, Beaker, PackageCheck, Copy } from 'lucide-react';

export default function RacikPakan() {
  const [activeTab, setActiveTab] = useState<'wo' | 'master' | 'formula'>('wo');
  
  // Data
  const [recipes, setRecipes] = useState<FeedRecipe[]>([]);
  const [recipeItems, setRecipeItems] = useState<FeedRecipeItem[]>([]);
  const [wos, setWos] = useState<FeedProductionOrder[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);

  const [search, setSearch] = useState('');

  // Modals & Forms
  const [isMasterModalOpen, setIsMasterModalOpen] = useState(false);
  const [editingMasterId, setEditingMasterId] = useState<string | null>(null);
  const [masterForm, setMasterForm] = useState<Partial<FeedRecipe>>({
    name: '', feed_type: 'Layer', estimated_yield_per_batch: 0, yield_unit: 'Kg', notes: '', is_active: true
  });

  // Formula State
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>('');
  const [formulaItemsEditor, setFormulaItemsEditor] = useState<Partial<FeedRecipeItem>[]>([]);

  // WO State
  const [isWoModalOpen, setIsWoModalOpen] = useState(false);
  const [woForm, setWoForm] = useState<Partial<FeedProductionOrder>>({
    project_id: '', recipe_id: '', batch_count: 1, start_date: new Date().toISOString().split('T')[0], pic: '', notes: ''
  });

  // Process/Complete WO State
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [processWo, setProcessWo] = useState<FeedProductionOrder | null>(null);
  const [processForm, setProcessForm] = useState({
    actual_yield: 0, completed_date: new Date().toISOString().split('T')[0], labor_cost: 0, machine_electricity_cost: 0, additional_vitamin_cost: 0, overhead_cost: 0, other_cost: 0
  });
  const [processItems, setProcessItems] = useState<(FeedProductionOrderItem & { stock: number, avg_cost: number, estimated_qty: number })[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setRecipes((db as any).getAll('feed_recipes'));
    setRecipeItems((db as any).getAll('feed_recipe_items'));
    setWos((db as any).getAll('feed_production_orders'));
    setProjects((db as any).getAll('projects').filter((p: any) => p.status === 'Aktif'));
    setItems((db as any).getAll('items'));
    setMovements((db as any).getAll('inventory_movements'));
  };

  const getStock = (itemId: string) => {
    return movements.filter(m => m.item_id === itemId).reduce((total, m) => {
      if (m.direction === 'IN') return total + m.quantity;
      if (m.direction === 'OUT') return total - m.quantity;
      return total;
    }, 0);
  };

  const getAvgCost = (itemId: string) => costingService.getItemAverageCost(itemId);
  
  const getProjectName = (id: string) => projects.find(p => p.id === id)?.name || 'Unknown';
  const getItemName = (id: string) => items.find(i => i.id === id)?.name || 'Unknown';
  const getRecipeName = (id: string) => {
    const r = recipes.find(r => r.id === id);
    return r ? `${r.name} (v${r.version})` : 'Unknown';
  };

  const isRecipeUsed = (recipeId: string) => {
    return wos.some(w => w.recipe_id === recipeId && w.status === 'Completed');
  };

  // ---- MASTER RESEP ----
  const handleSaveMaster = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMasterId) {
      if (isRecipeUsed(editingMasterId)) {
        return alert('Resep ini sudah pernah dipakai di produksi selesai. Anda tidak bisa mengedit versi ini. Buatlah resep/versi baru.');
      }
      (db as any).update('feed_recipes', editingMasterId, masterForm);
    } else {
      const count = recipes.length + 1;
      (db as any).insert('feed_recipes', {
        ...masterForm as any,
        code: `FR-${String(count).padStart(3, '0')}`,
        version: 1,
        effective_date: new Date().toISOString().split('T')[0]
      });
    }
    setIsMasterModalOpen(false);
    loadData();
  };

  const handleCreateNewVersion = (recipe: FeedRecipe) => {
    const count = recipes.length + 1;
    const newRecipe = (db as any).insert('feed_recipes', {
      name: recipe.name,
      feed_type: recipe.feed_type,
      estimated_yield_per_batch: recipe.estimated_yield_per_batch,
      yield_unit: recipe.yield_unit,
      notes: recipe.notes,
      is_active: true,
      code: `FR-${String(count).padStart(3, '0')}`,
      version: recipe.version + 1,
      parent_recipe_id: recipe.id,
      effective_date: new Date().toISOString().split('T')[0]
    });

    // Copy items
    const itemsToCopy = recipeItems.filter(i => i.recipe_id === recipe.id);
    itemsToCopy.forEach(item => {
      (db as any).insert('feed_recipe_items', {
        recipe_id: newRecipe.id,
        item_id: item.item_id,
        qty_per_batch: item.qty_per_batch,
        unit: item.unit,
        percentage: item.percentage,
        notes: item.notes
      });
    });

    // Set old inactive optionally
    if (confirm('Versi baru berhasil dibuat. Apakah Anda ingin menonaktifkan versi sebelumnya?')) {
      (db as any).update('feed_recipes', recipe.id, { is_active: false });
    }
    
    loadData();
  };

  // ---- FORMULA RESEP ----
  useEffect(() => {
    if (selectedRecipeId && activeTab === 'formula') {
      const existing = recipeItems.filter(b => b.recipe_id === selectedRecipeId);
      setFormulaItemsEditor(existing.length > 0 ? [...existing] : []);
    } else {
      setFormulaItemsEditor([]);
    }
  }, [selectedRecipeId, activeTab, recipeItems]);

  const addFormulaRow = () => {
    setFormulaItemsEditor([...formulaItemsEditor, { recipe_id: selectedRecipeId, item_id: '', qty_per_batch: 1, unit: 'Kg', percentage: 0, notes: '' }]);
  };

  const updateFormulaRow = (index: number, field: string, value: any) => {
    const newItems = [...formulaItemsEditor];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === 'qty_per_batch') {
      const totalQty = newItems.reduce((s, i) => s + (Number(i.qty_per_batch) || 0), 0);
      if (totalQty > 0) {
        newItems.forEach(i => {
          i.percentage = ((Number(i.qty_per_batch) || 0) / totalQty) * 100;
        });
      }
    }
    setFormulaItemsEditor(newItems);
  };

  const removeFormulaRow = (index: number) => {
    const newItems = [...formulaItemsEditor];
    newItems.splice(index, 1);
    
    const totalQty = newItems.reduce((s, i) => s + (Number(i.qty_per_batch) || 0), 0);
    if (totalQty > 0) {
      newItems.forEach(i => {
        i.percentage = ((Number(i.qty_per_batch) || 0) / totalQty) * 100;
      });
    }

    setFormulaItemsEditor(newItems);
  };

  const handleSaveFormula = () => {
    if (!selectedRecipeId) return alert('Pilih resep dulu!');
    if (isRecipeUsed(selectedRecipeId)) return alert('Resep ini sudah pernah dipakai di produksi selesai. Anda tidak bisa mengedit versi ini. Buatlah resep/versi baru dari Master Resep.');
    if (formulaItemsEditor.length === 0) return alert('Minimal 1 item bahan harus ada!');
    
    const seen = new Set();
    for (const item of formulaItemsEditor) {
      if (!item.item_id) return alert('Semua baris bahan harus dipilih barangnya!');
      if ((item.qty_per_batch || 0) <= 0) return alert('Qty bahan harus lebih dari 0!');
      if (seen.has(item.item_id)) return alert('Tidak boleh ada duplikasi bahan dalam 1 resep!');
      seen.add(item.item_id);
    }

    const totalPct = formulaItemsEditor.reduce((s, i) => s + (i.percentage || 0), 0);
    if (Math.abs(totalPct - 100) > 0.1) {
      if (!confirm(`Total persentase komposisi adalah ${totalPct.toFixed(2)}% (tidak 100%). Tetap simpan?`)) return;
    }

    const oldBoms = (db as any).getAll('feed_recipe_items');
    const toKeep = oldBoms.filter((b: any) => b.recipe_id !== selectedRecipeId);
    localStorage.setItem('feed_recipe_items', JSON.stringify(toKeep));

    formulaItemsEditor.forEach(item => {
      (db as any).insert('feed_recipe_items', {
        recipe_id: selectedRecipeId,
        item_id: item.item_id as string,
        qty_per_batch: item.qty_per_batch || 1,
        unit: item.unit || 'Kg',
        percentage: item.percentage || 0,
        notes: item.notes || ''
      });
    });

    alert('Formula berhasil disimpan!');
    loadData();
  };

  // ---- WORK ORDER ----
  const getFormulaEstimate = () => {
    if (!woForm.recipe_id || !woForm.batch_count) return [];
    return recipeItems.filter(b => b.recipe_id === woForm.recipe_id).map(b => {
      const est = b.qty_per_batch * (woForm.batch_count || 0);
      const stock = getStock(b.item_id);
      const avgCost = getAvgCost(b.item_id);
      return { item_id: b.item_id, est, stock, isEnough: stock >= est, avgCost };
    });
  };

  const getEstimatedYield = () => {
    if (!woForm.recipe_id || !woForm.batch_count) return 0;
    const r = recipes.find(r => r.id === woForm.recipe_id);
    return r ? r.estimated_yield_per_batch * woForm.batch_count : 0;
  };

  const handleCreateWo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!woForm.project_id || !woForm.recipe_id) return alert('Pilih Project dan Resep!');
    if ((woForm.batch_count || 0) <= 0) return alert('Jumlah batch harus > 0!');
    
    const estimates = getFormulaEstimate();
    if (estimates.length === 0) return alert('Resep ini belum memiliki formula! Buat formula terlebih dahulu.');

    const estYield = getEstimatedYield();

    const count = wos.length + 1;
    const woNum = `FW-${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2, '0')}-${String(count).padStart(3, '0')}`;
    
    const newWo = (db as any).insert('feed_production_orders', {
      ...woForm as any,
      production_number: woNum,
      estimated_yield: estYield,
      actual_yield: 0,
      status: 'In Progress',
      total_material_cost: 0,
      labor_cost: 0,
      machine_electricity_cost: 0,
      additional_vitamin_cost: 0,
      overhead_cost: 0,
      other_cost: 0,
      total_production_cost: 0,
      hpp_per_kg: 0
    });

    estimates.forEach(est => {
      (db as any).insert('feed_production_order_items', {
        feed_production_order_id: newWo.id,
        item_id: est.item_id,
        estimated_qty: est.est,
        actual_qty: est.est,
        unit_price: 0,
        total_cost: 0
      });
    });

    setIsWoModalOpen(false);
    loadData();
  };

  const openProcessWo = (wo: FeedProductionOrder) => {
    const itemsForWo = (db as any).getAll('feed_production_order_items').filter((i: any) => i.feed_production_order_id === wo.id);
    
    const mapped = itemsForWo.map((i: any) => {
      const avgCost = getAvgCost(i.item_id);
      return {
        ...i,
        actual_qty: i.estimated_qty,
        stock: getStock(i.item_id),
        avg_cost: avgCost,
        unit_price: avgCost,
        total_cost: i.estimated_qty * avgCost
      };
    });

    setProcessWo(wo);
    setProcessItems(mapped);
    setProcessForm({
      actual_yield: wo.estimated_yield,
      completed_date: new Date().toISOString().split('T')[0],
      labor_cost: wo.labor_cost || 0,
      machine_electricity_cost: wo.machine_electricity_cost || 0,
      additional_vitamin_cost: wo.additional_vitamin_cost || 0,
      overhead_cost: wo.overhead_cost || 0,
      other_cost: wo.other_cost || 0
    });
    setIsProcessModalOpen(true);
  };

  const updateProcessItem = (index: number, actual_qty: number) => {
    const newItems = [...processItems];
    newItems[index].actual_qty = actual_qty;
    newItems[index].total_cost = actual_qty * newItems[index].avg_cost;
    setProcessItems(newItems);
  };

  const handleCompleteWo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!processWo) return;
    
    if (processForm.actual_yield <= 0) return alert('Qty hasil aktual pakan (Kg) harus > 0!');

    let hasZeroCost = false;
    for (const item of processItems) {
      if (item.actual_qty < 0) return alert('Qty aktual bahan tidak boleh negatif!');
      if (item.actual_qty > item.stock) return alert(`Stok tidak cukup untuk bahan ${getItemName(item.item_id)}!`);
      if (item.avg_cost === 0) hasZeroCost = true;
    }

    if (hasZeroCost) {
      if (!confirm('Peringatan: Ada bahan yang belum memiliki harga rata-rata (Harga 0). HPP produksi akan menjadi Incomplete. Tetap lanjutkan?')) return;
    } else {
      if (!confirm('Yakin menyelesaikan produksi ini? Stok bahan akan dipotong dan stok pakan jadi akan ditambahkan.')) return;
    }

    const { success, message } = feedProductionService.completeFeedProductionOrder(
      processWo.id,
      processForm.actual_yield,
      processItems,
      {
        labor_cost: processForm.labor_cost,
        machine_electricity_cost: processForm.machine_electricity_cost,
        additional_vitamin_cost: processForm.additional_vitamin_cost,
        overhead_cost: processForm.overhead_cost,
        other_cost: processForm.other_cost
      },
      'system'
    );

    if (!success) {
      alert(`Gagal menyelesaikan produksi: ${message}`);
      return;
    }

    setIsProcessModalOpen(false);
    loadData();
  };

  const handleReverseWo = (wo: FeedProductionOrder) => {
    const reason = prompt('Masukkan alasan pembatalan / reversal (min. 10 karakter):');
    if (!reason) return;

    try {
      const { success, message } = feedProductionService.reverseFeedProductionOrder(wo.id, reason, 'system');
      if (!success) {
        alert(`Gagal: ${message}`);
        return;
      }
      loadData();
    } catch(err: any) {
      alert(`Gagal reverse: ${err.message}`);
    }
  };

  // --- RENDERS ---
  const filteredRecipes = recipes.filter(r => r.name.toLowerCase().includes(search.toLowerCase()) || r.code.toLowerCase().includes(search.toLowerCase()));
  const filteredWOs = wos.filter(w => w.production_number.toLowerCase().includes(search.toLowerCase()));

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'Draft': return 'default';
      case 'In Progress': return 'info';
      case 'Completed': return 'success';
      case 'Cancelled': return 'error';
      case 'Reversed': return 'warning';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold leading-7 text-slate-900">Racik Pakan</h2>
          <p className="mt-1 text-sm text-slate-500">
            Manajemen proses produksi pakan, resep/formula, dan HPP pakan jadi.
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'wo' && (
            <button onClick={() => { setWoForm({project_id: '', recipe_id: '', batch_count: 1, start_date: new Date().toISOString().split('T')[0]}); setIsWoModalOpen(true); }} className="inline-flex items-center gap-x-2 rounded-md bg-brand-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-500">
              <Plus className="-ml-0.5 h-5 w-5" /> Buat WO Racik
            </button>
          )}
          {activeTab === 'master' && (
            <button onClick={() => { setEditingMasterId(null); setMasterForm({name:'', feed_type:'Layer', estimated_yield_per_batch:0, yield_unit:'Kg', notes:'', is_active:true}); setIsMasterModalOpen(true); }} className="inline-flex items-center gap-x-2 rounded-md bg-brand-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-500">
              <Plus className="-ml-0.5 h-5 w-5" /> Tambah Resep
            </button>
          )}
        </div>
      </div>

      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          <button onClick={() => setActiveTab('wo')} className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${activeTab === 'wo' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'}`}>Work Order Racik</button>
          <button onClick={() => setActiveTab('master')} className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${activeTab === 'master' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'}`}>Master Resep</button>
          <button onClick={() => setActiveTab('formula')} className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${activeTab === 'formula' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'}`}>Formula Resep</button>
        </nav>
      </div>

      {activeTab !== 'formula' && (
        <div className="flex gap-4">
          <div className="relative flex-1 max-w-md">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><Search className="h-5 w-5 text-slate-400" /></div>
            <input type="text" className="block w-full rounded-md border-0 py-1.5 pl-10 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm" placeholder="Cari..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      )}

      {/* WO TAB */}
      {activeTab === 'wo' && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-900">No. WO</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Resep (Ver)</th>
                <th className="px-3 py-3.5 text-center text-sm font-semibold text-slate-900">Batch</th>
                <th className="px-3 py-3.5 text-center text-sm font-semibold text-slate-900">Hasil (Kg)</th>
                <th className="px-3 py-3.5 text-center text-sm font-semibold text-slate-900">Yield</th>
                <th className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900">HPP / Kg</th>
                <th className="px-3 py-3.5 text-center text-sm font-semibold text-slate-900">Status</th>
                <th className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredWOs.map(wo => {
                const yieldPct = wo.estimated_yield > 0 && wo.status === 'Completed' ? ((wo.actual_yield / wo.estimated_yield) * 100).toFixed(1) + '%' : '-';
                return (
                <tr key={wo.id}>
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-bold text-slate-900">
                    {wo.production_number}
                    <div className="text-xs text-slate-500 font-normal">{getProjectName(wo.project_id)}</div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-900">{getRecipeName(wo.recipe_id)}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500 text-center">{wo.batch_count}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-900 text-center">
                    {wo.status === 'Completed' ? <span className="font-bold">{wo.actual_yield}</span> : <span className="text-slate-400">est: {wo.estimated_yield}</span>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500 text-center">{yieldPct}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-900 text-right">
                    {wo.hpp_per_kg ? wo.hpp_per_kg.toLocaleString('id-ID') : '-'}
                    {wo.costing_status === 'Incomplete' && <span className="text-red-500 ml-1" title="Costing Incomplete">⚠️</span>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-center"><Badge variant={getStatusBadge(wo.status) as any}>{wo.status}</Badge></td>
                  <td className="whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium">
                    {wo.status === 'In Progress' && (
                      <button onClick={() => openProcessWo(wo)} className="text-brand-600 hover:text-brand-900 flex items-center gap-1 justify-end w-full"><PackageCheck className="w-4 h-4"/> Selesaikan</button>
                    )}
                    {wo.status === 'Completed' && (
                      <button onClick={() => handleReverseWo(wo)} className="text-red-600 hover:text-red-800 flex items-center gap-1 justify-end w-full"><RotateCcw className="w-4 h-4"/> Reverse</button>
                    )}
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      )}

      {/* MASTER TAB */}
      {activeTab === 'master' && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-900">Kode</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Nama Resep (Ver)</th>
                <th className="px-3 py-3.5 text-center text-sm font-semibold text-slate-900">Jenis</th>
                <th className="px-3 py-3.5 text-center text-sm font-semibold text-slate-900">Est Hasil / Batch</th>
                <th className="px-3 py-3.5 text-center text-sm font-semibold text-slate-900">Status</th>
                <th className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredRecipes.map(c => (
                <tr key={c.id}>
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-slate-900">{c.code}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-900 font-bold">{c.name} <span className="text-brand-600 font-normal">v{c.version}</span></td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500 text-center"><Badge variant="info">{c.feed_type}</Badge></td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500 text-center">{c.estimated_yield_per_batch} {c.yield_unit}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-center"><Badge variant={c.is_active ? 'success':'default'}>{c.is_active ? 'Aktif' : 'Nonaktif'}</Badge></td>
                  <td className="whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium flex justify-end gap-3">
                    <button onClick={() => handleCreateNewVersion(c)} title="Buat Versi Baru" className="text-sbs-green-600"><Copy className="w-4 h-4"/></button>
                    <button onClick={() => { setEditingMasterId(c.id); setMasterForm(c); setIsMasterModalOpen(true); }} className="text-brand-600"><Edit className="w-4 h-4"/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* FORMULA TAB */}
      {activeTab === 'formula' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-1 bg-white p-4 rounded-lg border border-slate-200">
            <h3 className="text-sm font-medium text-slate-900 mb-4 flex items-center gap-2"><Beaker className="w-4 h-4"/> Pilih Resep</h3>
            <div className="space-y-2">
              {recipes.map(r => (
                <button key={r.id} onClick={() => setSelectedRecipeId(r.id)} className={`w-full text-left px-3 py-2 rounded-md text-sm flex justify-between items-center ${selectedRecipeId === r.id ? 'bg-brand-50 text-brand-700 font-medium ring-1 ring-brand-600' : 'text-slate-700 hover:bg-slate-50'}`}>
                  <span>{r.name}</span>
                  <span className="text-xs bg-white px-1.5 py-0.5 rounded shadow-sm border border-slate-200">v{r.version}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="md:col-span-3">
            {selectedRecipeId ? (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                  <div>
                    <h3 className="font-semibold text-slate-900">Formula: {getRecipeName(selectedRecipeId)}</h3>
                    {isRecipeUsed(selectedRecipeId) && <span className="text-xs text-red-600 font-medium flex items-center gap-1 mt-1"><AlertTriangle className="w-3 h-3"/> Resep ini sudah digunakan, tidak bisa diubah. Buat versi baru.</span>}
                  </div>
                  {!isRecipeUsed(selectedRecipeId) && (
                    <button onClick={handleSaveFormula} className="inline-flex items-center gap-1 bg-sbs-green-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-sbs-green-700"><Save className="w-4 h-4"/> Simpan Formula</button>
                  )}
                </div>
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-12 gap-2 mb-2 text-xs font-semibold text-slate-700 uppercase tracking-wide">
                    <div className="col-span-6">Bahan Material</div>
                    <div className="col-span-3 text-center">Qty / Batch</div>
                    <div className="col-span-2 text-center">Persentase</div>
                    <div className="col-span-1 text-center">Aksi</div>
                  </div>
                  {formulaItemsEditor.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-6">
                        <select disabled={isRecipeUsed(selectedRecipeId)} value={item.item_id} onChange={e => updateFormulaRow(idx, 'item_id', e.target.value)} className="block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm">
                          <option value="">-- Pilih Bahan --</option>
                          {items.filter(i => ['Bahan Pakan', 'Vitamin/Obat', 'Umum'].includes(i.category)).map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                        </select>
                      </div>
                      <div className="col-span-3 flex gap-1">
                        <input type="number" step="0.01" min="0.01" disabled={isRecipeUsed(selectedRecipeId)} value={item.qty_per_batch} onChange={e => updateFormulaRow(idx, 'qty_per_batch', Number(e.target.value))} className="block w-full rounded-md border-0 py-1.5 text-center text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm" />
                        <span className="inline-flex items-center px-2 text-sm text-slate-500 bg-slate-50 border border-slate-300 rounded-md">Kg</span>
                      </div>
                      <div className="col-span-2 text-center text-sm font-medium text-slate-700 bg-slate-50 py-1.5 rounded-md border border-slate-200">
                        {item.percentage?.toFixed(2)}%
                      </div>
                      <div className="col-span-1 text-center">
                        {!isRecipeUsed(selectedRecipeId) && (
                          <button onClick={() => removeFormulaRow(idx)} className="text-red-500 hover:text-red-700"><AlertTriangle className="w-5 h-5 mx-auto"/></button>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  <div className="grid grid-cols-12 gap-2 mt-4 pt-4 border-t border-slate-200 items-center">
                    <div className="col-span-6 text-right font-bold text-sm">TOTAL KOMPOSISI:</div>
                    <div className="col-span-3 text-center font-bold text-sm text-brand-700">{formulaItemsEditor.reduce((s, i) => s + (Number(i.qty_per_batch)||0), 0)} Kg</div>
                    <div className="col-span-2 text-center font-bold text-sm text-brand-700">{formulaItemsEditor.reduce((s, i) => s + (i.percentage||0), 0).toFixed(2)}%</div>
                  </div>

                  {!isRecipeUsed(selectedRecipeId) && (
                    <button onClick={addFormulaRow} className="mt-4 text-sm text-brand-600 hover:text-brand-800 font-medium flex items-center gap-1"><Plus className="w-4 h-4"/> Tambah Bahan</button>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-12 text-center text-slate-500">
                Pilih resep di sebelah kiri untuk mengatur Formula.
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE WO MODAL */}
      <Modal isOpen={isWoModalOpen} onClose={() => setIsWoModalOpen(false)} title="Buat WO Racik Pakan">
        <form onSubmit={handleCreateWo} className="space-y-4 max-h-[80vh] overflow-y-auto px-1">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium leading-6 text-slate-900">Project</label>
              <select required value={woForm.project_id} onChange={e => setWoForm({...woForm, project_id: e.target.value})} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm">
                <option value="">- Pilih Project -</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium leading-6 text-slate-900">Tanggal Mulai</label>
              <input type="date" required value={woForm.start_date} onChange={e => setWoForm({...woForm, start_date: e.target.value})} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium leading-6 text-slate-900">Resep</label>
              <select required value={woForm.recipe_id} onChange={e => setWoForm({...woForm, recipe_id: e.target.value})} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm">
                <option value="">- Pilih Resep -</option>
                {recipes.filter(c => c.is_active).map(c => <option key={c.id} value={c.id}>{c.name} (v{c.version})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium leading-6 text-slate-900">Jumlah Batch</label>
              <input type="number" min="1" required value={woForm.batch_count} onChange={e => setWoForm({...woForm, batch_count: Number(e.target.value)})} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm" />
            </div>
          </div>

          {woForm.recipe_id && woForm.batch_count && (
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mt-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-medium text-slate-900">Kebutuhan Bahan:</h4>
                <Badge variant="info">Est. Hasil: {getEstimatedYield()} Kg</Badge>
              </div>
              <div className="space-y-2">
                {getFormulaEstimate().map(est => (
                  <div key={est.item_id} className="flex justify-between items-center text-sm">
                    <span className="text-slate-700 flex items-center gap-2">
                      {getItemName(est.item_id)}
                      {est.avgCost === 0 && <span className="text-[10px] bg-red-100 text-red-600 px-1 py-0.5 rounded">Cost 0</span>}
                    </span>
                    <div className="flex gap-4">
                      <span className="text-slate-900 font-medium">Est: {est.est} Kg</span>
                      <span className={`w-24 text-right ${est.isEnough ? 'text-green-600' : 'text-red-600 font-bold'}`}>Stok: {est.stock}</span>
                    </div>
                  </div>
                ))}
                {getFormulaEstimate().length === 0 && <p className="text-xs text-red-500">Formula kosong!</p>}
              </div>
            </div>
          )}
          
          <div className="mt-5 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
            <button type="submit" className="inline-flex w-full justify-center rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-500 sm:col-start-2">Buat WO</button>
            <button type="button" onClick={() => setIsWoModalOpen(false)} className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-900 ring-1 ring-inset ring-slate-300 sm:col-start-1 sm:mt-0">Batal</button>
          </div>
        </form>
      </Modal>

      {/* PROCESS WO MODAL */}
      <Modal isOpen={isProcessModalOpen} onClose={() => setIsProcessModalOpen(false)} title="Penyelesaian Racik Pakan">
        <form onSubmit={handleCompleteWo} className="space-y-4 max-h-[85vh] overflow-y-auto px-1">
          <div className="bg-blue-50 p-3 rounded-md border border-blue-100 flex justify-between items-center">
            <div>
              <p className="text-sm text-blue-800 font-bold">{processWo?.production_number}</p>
              <p className="text-xs text-blue-700">{processWo ? getRecipeName(processWo.recipe_id) : ''}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-blue-700">Batch: <strong>{processWo?.batch_count}</strong></p>
              <p className="text-xs text-blue-700">Est Yield: <strong>{processWo?.estimated_yield} Kg</strong></p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium leading-6 text-slate-900">Tgl Selesai</label>
              <input type="date" required value={processForm.completed_date} onChange={e => setProcessForm({...processForm, completed_date: e.target.value})} className="block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium leading-6 text-slate-900">Hasil Pakan Jadi (Aktual Kg)</label>
              <input type="number" min="0.1" step="0.1" required value={processForm.actual_yield} onChange={e => setProcessForm({...processForm, actual_yield: Number(e.target.value)})} className="block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm" />
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-900 mb-2 border-b pb-1">Pemakaian Bahan Aktual</h4>
            <div className="space-y-3">
              {processItems.map((item, idx) => {
                const diff = item.actual_qty - item.estimated_qty;
                return (
                <div key={item.id} className="bg-slate-50 p-3 rounded border border-slate-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-slate-900 flex items-center gap-2">
                      {getItemName(item.item_id)}
                      {item.avg_cost === 0 && <span className="text-[10px] bg-red-100 text-red-600 px-1 py-0.5 rounded">Cost 0</span>}
                    </span>
                    <span className="text-xs text-slate-500">Est: {item.estimated_qty} | Stok: <span className={item.stock < item.actual_qty ? 'text-red-600 font-bold' : ''}>{item.stock}</span></span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-1/3 relative">
                      <label className="text-xs text-slate-500">Aktual Pakai (Kg)</label>
                      <input type="number" step="0.01" min="0" required value={item.actual_qty} onChange={e => updateProcessItem(idx, Number(e.target.value))} className="block w-full rounded-md border-0 py-1 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm text-center" />
                      {diff !== 0 && <span className={`absolute -right-12 top-6 text-xs font-bold ${diff > 0 ? 'text-red-500' : 'text-green-500'}`}>{diff > 0 ? '+' : ''}{diff}</span>}
                    </div>
                    <div className="flex-1 text-right">
                      <p className="text-xs text-slate-500">Total Biaya ({item.avg_cost.toLocaleString('id-ID')}/kg)</p>
                      <p className="text-sm font-semibold text-slate-900">Rp {item.total_cost.toLocaleString('id-ID')}</p>
                    </div>
                  </div>
                </div>
              )})}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t pt-4">
            <div>
              <label className="block text-xs font-medium text-slate-700">Biaya Tenaga Kerja</label>
              <input type="number" min="0" value={processForm.labor_cost} onChange={e => setProcessForm({...processForm, labor_cost: Number(e.target.value)})} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Listrik / Mesin</label>
              <input type="number" min="0" value={processForm.machine_electricity_cost} onChange={e => setProcessForm({...processForm, machine_electricity_cost: Number(e.target.value)})} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Vitamin Tambahan</label>
              <input type="number" min="0" value={processForm.additional_vitamin_cost} onChange={e => setProcessForm({...processForm, additional_vitamin_cost: Number(e.target.value)})} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Overhead & Lain</label>
              <input type="number" min="0" value={processForm.overhead_cost + processForm.other_cost} onChange={e => setProcessForm({...processForm, overhead_cost: Number(e.target.value), other_cost: 0})} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm" />
            </div>
          </div>

          <div className="bg-brand-50 p-4 rounded-lg mt-4 border border-brand-100 flex justify-between items-center">
            <div>
              <p className="text-sm font-bold text-brand-900">Estimasi HPP Per Kg:</p>
              <p className="text-xs text-brand-700">Total Biaya / Qty Aktual Yield</p>
            </div>
            <p className="text-xl font-extrabold text-brand-600">
              Rp {((processItems.reduce((s, i) => s + i.total_cost, 0) + processForm.labor_cost + processForm.machine_electricity_cost + processForm.additional_vitamin_cost + processForm.overhead_cost + processForm.other_cost) / (processForm.actual_yield || 1)).toLocaleString('id-ID')}
            </p>
          </div>

          <div className="mt-5 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
            <button type="submit" className="inline-flex w-full justify-center rounded-md bg-sbs-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sbs-green-500 sm:col-start-2">Selesaikan & Posting</button>
            <button type="button" onClick={() => setIsProcessModalOpen(false)} className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-900 ring-1 ring-inset ring-slate-300 sm:col-start-1 sm:mt-0">Batal</button>
          </div>
        </form>
      </Modal>

      {/* MASTER RESEP FORM MODAL */}
      <Modal isOpen={isMasterModalOpen} onClose={() => setIsMasterModalOpen(false)} title={editingMasterId ? 'Edit Resep' : 'Tambah Resep'}>
        <form onSubmit={handleSaveMaster} className="space-y-4">
          <div>
            <label className="block text-sm font-medium leading-6 text-slate-900">Nama Resep</label>
            <input type="text" required value={masterForm.name} onChange={e => setMasterForm({...masterForm, name: e.target.value})} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium leading-6 text-slate-900">Jenis Pakan</label>
              <select required value={masterForm.feed_type} onChange={e => setMasterForm({...masterForm, feed_type: e.target.value as any})} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm">
                <option value="Starter">Starter</option>
                <option value="Grower">Grower</option>
                <option value="Layer">Layer</option>
                <option value="Omega">Omega</option>
                <option value="Custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium leading-6 text-slate-900">Est Hasil per Batch (Kg)</label>
              <input type="number" required value={masterForm.estimated_yield_per_batch} onChange={e => setMasterForm({...masterForm, estimated_yield_per_batch: Number(e.target.value)})} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium leading-6 text-slate-900">Catatan</label>
            <textarea rows={2} value={masterForm.notes} onChange={e => setMasterForm({...masterForm, notes: e.target.value})} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm" />
          </div>
          <div className="flex items-center gap-2 mt-4">
            <input type="checkbox" id="m_active" checked={masterForm.is_active} onChange={e => setMasterForm({...masterForm, is_active: e.target.checked})} className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600" />
            <label htmlFor="m_active" className="text-sm text-slate-900">Resep Aktif</label>
          </div>
          <div className="mt-5 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
            <button type="submit" className="inline-flex w-full justify-center rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-500 sm:col-start-2">Simpan</button>
            <button type="button" onClick={() => setIsMasterModalOpen(false)} className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-900 ring-1 ring-inset ring-slate-300 sm:col-start-1 sm:mt-0">Batal</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
