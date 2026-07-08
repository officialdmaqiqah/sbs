import { useState, useMemo } from 'react'; 
import type { Product, Package, ProductCategory } from '../types';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { Plus, Edit, Search, PlusCircle, Trash2, AlertTriangle, Box, CheckCircle, XCircle } from 'lucide-react';
import { useItems } from '../hooks/useItems';
import { getDataProvider } from '../providers';
import { useProject } from '../contexts/ProjectContext';
import { useInventoryBalances } from '../hooks/useInventoryBalances';
import { usePackageComponents } from '../hooks/usePackageComponents';
import toast from 'react-hot-toast';
import { CurrencyInput } from '../components/ui/CurrencyInput';

const CATEGORIES: ProductCategory[] = ['Paket Usaha', 'Ayam Petelur', 'Kandang', 'Telur', 'Lainnya'];
const SUB_CATEGORIES_TELUR = ['Telur Biasa', 'Telur Omega', 'Telur Ayam Kampung', 'Telur Asin Ayam'];

export default function Products() {
  const { activeProject } = useProject();
  const [activeTab, setActiveTab] = useState<'products' | 'packages' | 'availability'>('products');
  
  // Form State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ProductCategory | 'All'>('All');

  // Product Form
  const [prodForm, setProdForm] = useState<Partial<Product>>({
    name: '', category: 'Ayam Petelur', price: 0, unit: '', is_active: true, stock_tracked: false, inventory_item_id: '', subCategory: ''
  });

  // Package Form
  const [pkgForm, setPkgForm] = useState<Partial<Package>>({
    name: '', price: 0, chicken_capacity: 0, cage_type: '', cage_size: '', chicken_qty: 0, feed_qty: '',
    includes_vitamin: false, includes_roof: false, includes_feeder: false, 
    includes_drinker_nipple: false, includes_water_container: false, 
    includes_consultation: false, can_request: false, is_active: true
  });
  const [pkgCompsForm, setPkgCompsForm] = useState<any[]>([]);
  const [packageActiveTab, setPackageActiveTab] = useState<'info' | 'components'>('info');

  const { data: allItems, loading, refetch: refetchItems } = useItems();
  const { data: inventoryBalances } = useInventoryBalances({ projectId: activeProject?.id || 'ALL' });
  const { data: packageComponents, saveComponents, refetch: refetchComps } = usePackageComponents();
  
  const products = useMemo(() => allItems.filter(i => i.itemType === 'PRODUCT' || (!i.itemType && i.category !== 'Paket' && i.category !== 'Paket Usaha')), [allItems]);
  const packages = useMemo(() => allItems.filter(i => i.itemType === 'PACKAGE' || i.category === 'Paket' || i.category === 'Paket Usaha'), [allItems]);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadData = () => {
    refetchItems();
    refetchComps();
  };

  const handleSaveProduct = async (e: any) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    try {
      const repo = getDataProvider().getItemRepository();
      const payload: any = {
        name: prodForm.name,
        category: prodForm.category,
        uom: prodForm.unit,
        active: prodForm.is_active,
        selling_price: prodForm.price,
        item_type: 'PRODUCT'
      };

      if (prodForm.subCategory) {
        payload.description = prodForm.subCategory; // save subCategory to description or custom field
      }

      if (editingId) {
        await repo.updateItem(editingId, payload);
      } else {
        await repo.createItem({ 
          ...payload, 
          code: `PRD-${String(products.length + 1).padStart(3, '0')}` 
        });
      }
      setIsProductModalOpen(false);
      refetchItems();
    } catch (err: any) {
      setSaveError(err.message || 'Gagal menyimpan produk');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePackage = async (e: any) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    let pkgId = editingId;
    
    try {
      const repo = getDataProvider().getItemRepository();
      const payload = {
        name: pkgForm.name,
        category: 'Paket Usaha',
        item_type: 'PACKAGE',
        active: pkgForm.is_active,
        package_price: pkgForm.price,
        chicken_capacity: pkgForm.chicken_capacity,
        cage_size: pkgForm.cage_size,
      };

      if (editingId) {
        await repo.updateItem(editingId, payload);
      } else {
        const pCount = packages.length + 1;
        const newPkg = { 
          ...payload, 
          code: `PKG-${String(pCount).padStart(3, '0')}` 
        };
        const created = await repo.createItem(newPkg);
        pkgId = created.id;
      }
      
      if (pkgId) {
        await saveComponents(pkgId, pkgCompsForm);
      }

      setIsPackageModalOpen(false);
      loadData();
    } catch (err: any) {
      setSaveError(err.message || 'Gagal menyimpan paket');
    } finally {
      setIsSaving(false);
    }
  };

  const openAddProduct = () => {
    setEditingId(null);
    setProdForm({ name: '', category: 'Ayam Petelur', price: 0, unit: '', is_active: true, stock_tracked: false, inventory_item_id: '', subCategory: '' });
    setIsProductModalOpen(true);
  };

  const openEditProduct = (p: any) => {
    setEditingId(p.id);
    setProdForm({
      name: p.name,
      category: p.category,
      price: p.sellingPrice || p.price || 0,
      unit: p.unit || p.uom || '',
      is_active: p.active !== undefined ? p.active : true,
      subCategory: p.description
    });
    setIsProductModalOpen(true);
  };

  const openAddPackage = () => {
    setEditingId(null);
    setPkgForm({
      name: '', price: 0, chicken_capacity: 0, cage_type: '', cage_size: '', chicken_qty: 0, feed_qty: '',
      includes_vitamin: false, includes_roof: false, includes_feeder: false, 
      includes_drinker_nipple: false, includes_water_container: false, 
      includes_consultation: false, can_request: false, is_active: true
    });
    setPkgCompsForm([]);
    setPackageActiveTab('info');
    setIsPackageModalOpen(true);
  };

  const openEditPackage = (p: any) => {
    setEditingId(p.id);
    setPkgForm({
      name: p.name,
      price: p.packagePrice || p.price || 0,
      chicken_capacity: p.chickenCapacity || p.chicken_capacity || 0,
      cage_size: p.cageSize || p.cage_size || '',
      is_active: p.active !== undefined ? p.active : true
    });
    setPkgCompsForm(packageComponents.filter(c => c.package_id === p.id));
    setPackageActiveTab('info');
    setIsPackageModalOpen(true);
  };

  const handleGenerateMapping = () => {
    const newComps: any[] = [...pkgCompsForm];
    
    if (pkgForm.chicken_qty && !newComps.find(c => c.component_type === 'Ayam')) {
      const ayamItem = allItems?.find(i => i.category === 'Ayam Petelur');
      if (ayamItem) newComps.push({ item_id: ayamItem.id, quantity_per_package: pkgForm.chicken_qty, component_type: 'Ayam', required: true });
    }
    
    if (pkgForm.feed_qty && !newComps.find(c => c.component_type === 'Pakan')) {
      const pakanItem = allItems?.find((i: any) => i.category === 'Pakan Jadi' || i.category === 'Bahan Pakan');
      if (pakanItem) newComps.push({ item_id: pakanItem.id, quantity_per_package: 1, component_type: 'Pakan', required: true });
    }
    
    if (pkgForm.cage_type && !newComps.find(c => c.component_type === 'Kandang')) {
      const kandangItem = allItems?.find((i: any) => i.category === 'Kandang Jadi' || i.category === 'Kandang');
      if (kandangItem) newComps.push({ item_id: kandangItem.id, quantity_per_package: 1, component_type: 'Kandang', required: true });
    }

    if (newComps.length === pkgCompsForm.length) {
      toast.error('Tidak dapat menemukan mapping baru otomatis. Pastikan master item (Ayam Petelur, Pakan, Kandang) tersedia.');
    } else {
      setPkgCompsForm(newComps);
      toast.success('Mapping berhasil digenerate, silakan periksa dan sesuaikan quantity.');
    }
  };

  const seedPackages = async () => {
    if(!confirm('Apakah Anda yakin ingin men-seed data Paket Usaha default?')) return;
    setIsSaving(true);
    try {
      const repo = getDataProvider().getItemRepository();
      
      const ayamItem = allItems?.find(i => i.category === 'Ayam Petelur');
      const kandangItem = allItems?.find(i => i.category === 'Kandang Jadi' || i.name.toLowerCase().includes('kandang'));
      const pakanItem = allItems?.find(i => i.category === 'Pakan Jadi' || i.name.toLowerCase().includes('pakan'));

      const seedData = [
        { name: 'Sultan Starter', qty: 24, price: 5000000 },
        { name: 'Sultan Prime', qty: 48, price: 9500000 },
        { name: 'Sultan Platinum', qty: 96, price: 18000000 }
      ];

      for (const s of seedData) {
        const existing = packages.find(p => p.name === s.name);
        if (!existing) {
          const created = await repo.createItem({
            code: `PKG-${Math.floor(Math.random()*1000)}`,
            name: s.name,
            category: 'Paket Usaha',
            item_type: 'PACKAGE',
            active: true,
            package_price: s.price,
            chicken_capacity: s.qty
          });
          const comps = [];
          if (ayamItem) comps.push({ item_id: ayamItem.id, quantity_per_package: s.qty, component_type: 'Ayam', required: true });
          if (kandangItem) comps.push({ item_id: kandangItem.id, quantity_per_package: 1, component_type: 'Kandang', required: true });
          if (pakanItem) comps.push({ item_id: pakanItem.id, quantity_per_package: 1, component_type: 'Pakan', required: true });
          
          await saveComponents(created.id, comps);
        }
      }
      toast.error('Seed sukses!');
      loadData();
    } catch(e: any) {
      toast.error('Error: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredProducts = products.filter(p => 
    (categoryFilter === 'All' || p.category === categoryFilter) &&
    (p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredPackages = packages.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase())
  );

  const getStock = (itemId: string) => {
    return inventoryBalances?.find(b => b.item_id === itemId)?.quantity || 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold leading-7 text-slate-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Produk & Paket Usaha
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Katalog master ayam, kandang, telur, dan paket kemitraan SBS.
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'products' ? (
            <button onClick={openAddProduct} className="inline-flex items-center gap-x-2 rounded-md bg-brand-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-500">
              <Plus className="-ml-0.5 h-5 w-5" />
              Tambah Produk
            </button>
          ) : activeTab === 'packages' ? (
            <>
              <button onClick={seedPackages} className="inline-flex items-center gap-x-2 rounded-md bg-white border border-slate-300 px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
                Seed Default Paket
              </button>
              <button onClick={openAddPackage} className="inline-flex items-center gap-x-2 rounded-md bg-brand-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-500">
                <Plus className="-ml-0.5 h-5 w-5" />
                Tambah Paket
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button onClick={() => setActiveTab('products')} className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${activeTab === 'products' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'}`}>Produk Retail</button>
          <button onClick={() => setActiveTab('packages')} className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${activeTab === 'packages' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'}`}>Paket Usaha</button>
          <button onClick={() => setActiveTab('availability')} className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${activeTab === 'availability' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'}`}>Cek Ketersediaan Paket</button>
        </nav>
      </div>

      {(activeTab === 'products' || activeTab === 'packages') && (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input type="text" className="block w-full rounded-md border-0 py-1.5 pl-10 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm sm:leading-6" placeholder="Cari kode atau nama..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {activeTab === 'products' && (
            <select className="block w-full sm:w-48 rounded-md border-0 py-1.5 pl-3 pr-10 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm sm:leading-6" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as any)}>
              <option value="All">Semua Kategori</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
        </div>
      )}

      {/* RETAIL PRODUCTS TAB */}
      {activeTab === 'products' && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">Memuat data...</div>
          ) : (
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-900">Kode</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Nama Produk</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Kategori</th>
                  <th className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900">Harga Jual (Rp)</th>
                  <th className="px-3 py-3.5 text-center text-sm font-semibold text-slate-900">Stok Tersedia</th>
                  <th className="px-3 py-3.5 text-center text-sm font-semibold text-slate-900">Status Dijual</th>
                  <th className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Edit</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredProducts.map((p: any) => {
                  const stock = getStock(p.id);
                  return (
                  <tr key={p.id}>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-bold text-slate-800">{p.code}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-900">
                      <div>{p.name}</div>
                      {p.category === 'Telur' && p.description && <div className="text-xs text-slate-500 mt-1">{p.description}</div>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500"><Badge variant="default">{p.category}</Badge></td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-900 text-right font-medium">{(p.sellingPrice || p.price || 0).toLocaleString('id-ID')}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-center font-bold text-brand-700">{stock} {p.unit || p.uom}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-center">
                      <Badge variant={(p.active !== undefined ? p.active : p.is_active) ? 'success' : 'default'}>{(p.active !== undefined ? p.active : p.is_active) ? 'Ya' : 'Tidak'}</Badge>
                    </td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                      <button onClick={() => openEditProduct(p)} className="text-brand-600 hover:text-brand-900"><Edit className="h-4 w-4" /></button>
                    </td>
                  </tr>
                )})}
                {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-slate-500">
                    Tidak ada produk.
                    <span className="text-xs text-slate-400 mt-2 block">Belum ada produk. Tambahkan produk retail atau buat Paket Usaha.</span>
                  </td>
                </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* PACKAGES TAB */}
      {activeTab === 'packages' && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-900">Kode</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Nama Paket Usaha</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Komponen</th>
                <th className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900">Harga (Rp)</th>
                <th className="px-3 py-3.5 text-center text-sm font-semibold text-slate-900">Status</th>
                <th className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Edit</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredPackages.map((p: any) => {
                const comps = packageComponents.filter(c => c.package_id === p.id);
                return (
                <tr key={p.id}>
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-bold text-slate-800">{p.code}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-600 font-bold">{p.name}</td>
                  <td className="px-3 py-4 text-sm text-slate-500">
                    <ul className="list-disc pl-4 text-xs">
                      {comps.map(c => {
                        const iName = allItems?.find(i => i.id === c.item_id)?.name || 'Unknown Item';
                        return <li key={c.id}>{c.quantity || c.quantity_per_package}x {iName}</li>;
                      })}
                      {comps.length === 0 && <span className="text-red-400 italic">Belum ada komponen</span>}
                    </ul>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-900 text-right font-medium">{(p.packagePrice || p.price || 0).toLocaleString('id-ID')}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-center">
                    <Badge variant={(p.active !== undefined ? p.active : p.is_active) ? 'success' : 'default'}>{(p.active !== undefined ? p.active : p.is_active) ? 'Aktif' : 'Nonaktif'}</Badge>
                  </td>
                  <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                    <button onClick={() => openEditPackage(p)} className="text-brand-600 hover:text-brand-900"><Edit className="h-4 w-4" /></button>
                  </td>
                </tr>
              )})}
              {filteredPackages.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-sm text-slate-500">Tidak ada paket ditemukan.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* AVAILABILITY TAB */}
      {activeTab === 'availability' && (
        <div className="space-y-4">
          <div className="bg-brand-50 border border-brand-200 rounded-lg p-4 mb-4 flex items-start gap-3">
            <Box className="w-5 h-5 text-brand-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-brand-800">Project Saat Ini: {activeProject?.name || 'Semua Project (Global)'}</h4>
              <p className="text-sm text-brand-600">Perhitungan ketersediaan stok komponen paket dihitung berdasarkan project yang sedang aktif. Ganti project di menu atas untuk mengecek stok project lain.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {packages.map((p: any) => {
              const comps = packageComponents.filter(c => c.package_id === p.id);
              let isMissing = false;
              let isNotReady = comps.length === 0;
              const issues: string[] = [];
              
              comps.forEach(c => {
                const reqQty = c.quantity || c.quantity_per_package || 0;
                const avlQty = getStock(c.item_id);
                const iName = allItems?.find(i => i.id === c.item_id)?.name || 'Unknown Item';
                if (avlQty < reqQty) {
                  isMissing = true;
                  issues.push(`${iName} (Kurang ${reqQty - avlQty})`);
                }
              });

              const isReady = !isMissing && !isNotReady;

              return (
                <div key={p.id} className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-start bg-slate-50">
                    <div>
                      <h3 className="font-bold text-slate-900">{p.name}</h3>
                      <p className="text-xs text-slate-500 mt-1">Rp {(p.packagePrice || p.price || 0).toLocaleString('id-ID')}</p>
                    </div>
                    {isReady ? (
                      <Badge variant="success" className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Siap Dijual</Badge>
                    ) : isNotReady ? (
                      <Badge variant="default" className="flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Belum Lengkap</Badge>
                    ) : (
                      <Badge variant="danger" className="flex items-center gap-1"><XCircle className="w-3 h-3" /> Stok Kurang</Badge>
                    )}
                  </div>
                  <div className="p-4 flex-grow">
                    <h4 className="text-xs font-semibold text-slate-700 mb-3 uppercase tracking-wider">Komponen & Stok:</h4>
                    <ul className="space-y-3">
                      {comps.map(c => {
                        const reqQty = c.quantity || c.quantity_per_package || 0;
                        const avlQty = getStock(c.item_id);
                        const iName = allItems?.find(i => i.id === c.item_id)?.name || 'Unknown Item';
                        const ok = avlQty >= reqQty;
                        return (
                          <li key={c.id} className="flex justify-between items-center text-sm">
                            <span className="text-slate-700 font-medium">{iName}</span>
                            <div className="text-right">
                              <span className="text-slate-500 text-xs mr-2">Butuh: {reqQty}</span>
                              <span className={`font-bold px-2 py-0.5 rounded ${ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                Ada: {avlQty}
                              </span>
                            </div>
                          </li>
                        );
                      })}
                      {comps.length === 0 && <li className="text-sm text-slate-500 italic">Belum ada pengaturan komponen.</li>}
                    </ul>
                  </div>
                  {issues.length > 0 && (
                    <div className="bg-red-50 p-3 border-t border-red-100 text-xs text-red-700">
                      <strong>Kekurangan:</strong> {issues.join(', ')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PRODUCT MODAL */}
      <Modal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} title={editingId ? 'Edit Produk' : 'Tambah Produk'}>
        <form onSubmit={handleSaveProduct} className="space-y-4">
          {saveError && <div className="bg-red-50 p-3 text-sm text-red-700 rounded border border-red-200">{saveError}</div>}
          <div>
            <label className="block text-sm font-medium leading-6 text-slate-900">Nama Produk</label>
            <input type="text" required value={prodForm.name} onChange={e => setProdForm({...prodForm, name: e.target.value})} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium leading-6 text-slate-900">Kategori</label>
            <select value={prodForm.category} onChange={e => setProdForm({...prodForm, category: e.target.value as any, subCategory: ''})} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm">
              {CATEGORIES.filter(c => c !== 'Paket Usaha').map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {prodForm.category === 'Telur' && (
            <div>
              <label className="block text-sm font-medium leading-6 text-slate-900">Subjenis Telur</label>
              <select required value={prodForm.subCategory || ''} onChange={e => setProdForm({...prodForm, subCategory: e.target.value})} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm">
                <option value="">-- Pilih Jenis Telur --</option>
                {SUB_CATEGORIES_TELUR.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium leading-6 text-slate-900">Harga Jual (Rp)</label>
              <CurrencyInput  required value={prodForm.price || ""} onChange={(val) => setProdForm({...prodForm, price: val})} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium leading-6 text-slate-900">Satuan (Ekor/Kg/Pcs)</label>
              <input type="text" required value={prodForm.unit} onChange={e => setProdForm({...prodForm, unit: e.target.value})} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm" />
            </div>
          </div>
          
          <div className="flex items-center gap-2 mt-4 bg-slate-50 p-3 rounded border border-slate-200">
            <input type="checkbox" id="p_active" checked={prodForm.is_active} onChange={e => setProdForm({...prodForm, is_active: e.target.checked})} className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600" />
            <label htmlFor="p_active" className="text-sm font-bold text-slate-900">Status Bisa Dijual</label>
          </div>
          <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
            <button disabled={isSaving} type="submit" className="inline-flex w-full justify-center rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-500 sm:col-start-2 disabled:opacity-50">{isSaving ? 'Menyimpan...' : 'Simpan Produk'}</button>
            <button disabled={isSaving} type="button" onClick={() => setIsProductModalOpen(false)} className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-900 ring-1 ring-inset ring-slate-300 sm:col-start-1 sm:mt-0">Batal</button>
          </div>
        </form>
      </Modal>

      {/* PACKAGE MODAL */}
      <Modal isOpen={isPackageModalOpen} onClose={() => setIsPackageModalOpen(false)} title={editingId ? 'Edit Paket Usaha' : 'Package Builder'}>
        <form onSubmit={handleSavePackage} className="space-y-4 max-h-[75vh] overflow-y-auto px-1">
          {saveError && <div className="bg-red-50 p-3 text-sm text-red-700 rounded border border-red-200">{saveError}</div>}
          <div className="border-b border-slate-200 mb-4">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button type="button" onClick={() => setPackageActiveTab('info')} className={`whitespace-nowrap border-b-2 py-2 px-1 text-sm font-medium ${packageActiveTab === 'info' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'}`}>Informasi Paket</button>
              <button type="button" onClick={() => setPackageActiveTab('components')} className={`whitespace-nowrap border-b-2 py-2 px-1 text-sm font-medium ${packageActiveTab === 'components' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'}`}>Komponen Paket</button>
            </nav>
          </div>

          {packageActiveTab === 'info' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium leading-6 text-slate-900">Nama Paket</label>
                <input type="text" required value={pkgForm.name} onChange={e => setPkgForm({...pkgForm, name: e.target.value})} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium leading-6 text-slate-900">Harga Paket (Rp)</label>
                  <CurrencyInput  required value={pkgForm.price || ""} onChange={(val) => setPkgForm({...pkgForm, price: val})} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium leading-6 text-slate-900">Kapasitas Indikatif (Ayam)</label>
                  <input type="number" required value={pkgForm.chicken_capacity} onChange={e => setPkgForm({...pkgForm, chicken_capacity: Number(e.target.value)})} className="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm" />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4 bg-slate-50 p-3 rounded border border-slate-200">
                <input type="checkbox" checked={pkgForm.is_active} onChange={e => setPkgForm({...pkgForm, is_active: e.target.checked})} className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600" />
                <label className="text-sm font-bold text-slate-900">Status Aktif Dijual</label>
              </div>
            </div>
          )}

          {packageActiveTab === 'components' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm text-slate-500">Pilih barang inventori yang menyusun paket ini.</p>
                <div className="flex gap-2">
                  <button type="button" onClick={handleGenerateMapping} className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-md border border-indigo-200 font-medium hover:bg-indigo-100">Cari Otomatis</button>
                  <button type="button" onClick={() => setPkgCompsForm([...pkgCompsForm, { item_id: '', quantity_per_package: 1, component_type: 'Lainnya', required: true }])} className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-md border border-slate-300 font-medium flex items-center gap-1 hover:bg-slate-200"><PlusCircle className="w-3 h-3" /> Tambah</button>
                </div>
              </div>

              {pkgCompsForm.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 border border-slate-200 border-dashed rounded-lg">
                  <p className="text-sm text-slate-500">Belum ada komponen.</p>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-slate-500">Pilih Barang Stok</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-500 w-32">Kuantitas</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-500 w-32">Tipe Komponen</th>
                        <th className="px-3 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {pkgCompsForm.map((comp, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2">
                            <select value={comp.item_id || ''} required onChange={e => {
                              const newComps = [...pkgCompsForm];
                              newComps[idx].item_id = e.target.value;
                              setPkgCompsForm(newComps);
                            }} className="block w-full rounded-md border-0 py-1 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-xs">
                              <option value="">-- Cari Barang --</option>
                              {allItems?.filter((i:any) => i.itemType !== 'PACKAGE').map((i: any) => <option key={i.id} value={i.id}>{i.name} ({i.category})</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" required min="0.01" step="0.01" value={comp.quantity_per_package || comp.quantity || ''} onChange={e => {
                              const newComps = [...pkgCompsForm];
                              newComps[idx].quantity = Number(e.target.value);
                              newComps[idx].quantity_per_package = Number(e.target.value);
                              setPkgCompsForm(newComps);
                            }} className="block w-full rounded-md border-0 py-1 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-xs" />
                          </td>
                          <td className="px-3 py-2">
                            <select value={comp.component_type || 'Lainnya'} onChange={e => {
                              const newComps = [...pkgCompsForm];
                              newComps[idx].component_type = e.target.value;
                              setPkgCompsForm(newComps);
                            }} className="block w-full rounded-md border-0 py-1 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-xs">
                              <option value="Ayam">Ayam</option>
                              <option value="Kandang">Kandang</option>
                              <option value="Pakan">Pakan</option>
                              <option value="Lainnya">Lainnya</option>
                            </select>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button type="button" onClick={() => {
                              const newComps = [...pkgCompsForm];
                              newComps.splice(idx, 1);
                              setPkgCompsForm(newComps);
                            }} className="text-red-500 hover:text-red-700 p-1">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
            <button disabled={isSaving} type="submit" className="inline-flex w-full justify-center rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-500 sm:col-start-2 disabled:opacity-50">{isSaving ? 'Menyimpan...' : 'Simpan Paket'}</button>
            <button disabled={isSaving} type="button" onClick={() => setIsPackageModalOpen(false)} className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-900 ring-1 ring-inset ring-slate-300 sm:col-start-1 sm:mt-0">Batal</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
