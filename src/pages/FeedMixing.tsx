import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye } from 'lucide-react';
import { useProductions } from '../hooks/useProductions';
import { useProject } from '../contexts/ProjectContext';
import { useInventoryBalances } from '../hooks/useInventoryBalances';
import Modal from '../components/Modal';
import Badge from '../components/Badge';

export default function FeedMixing() {
  const navigate = useNavigate();
  const { activeProject } = useProject();
  const { data: productions, loading, createProduction } = useProductions('FEED', activeProject?.id);
  const { data: inventoryItems } = useInventoryBalances({ projectId: activeProject?.id });
  
  const bahanPakan = inventoryItems.filter((i:any) => i.item?.category === 'Bahan Pakan');
  const pakanJadi = inventoryItems.filter((i:any) => i.item?.category === 'Pakan Jadi' || i.item?.category === 'Pakan');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState('');

  // Form State
  const [batchName, setBatchName] = useState('');
  const [productionDate, setProductionDate] = useState(new Date().toISOString().split('T')[0]);
  const [targetItemId, setTargetItemId] = useState('');
  const [targetQty, setTargetQty] = useState<number | ''>('');
  const [notes, setNotes] = useState('');

  // Material Inputs
  const [inputs, setInputs] = useState<{item_id: string, qty: number | ''}[]>([
    { item_id: '', qty: '' }
  ]);

  const filteredProductions = productions.filter(p => 
    p.production_number?.toLowerCase().includes(search.toLowerCase()) || 
    p.batch_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddInput = () => {
    setInputs([...inputs, { item_id: '', qty: '' }]);
  };

  const handleRemoveInput = (index: number) => {
    setInputs(inputs.filter((_, i) => i !== index));
  };

  const handleInputChange = (index: number, field: string, value: any) => {
    const newInputs = [...inputs];
    (newInputs[index] as any)[field] = value;
    setInputs(newInputs);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject) {
      alert('Project aktif harus dipilih!');
      return;
    }
    if (!targetItemId || !targetQty) {
      alert('Silakan pilih hasil pakan jadi dan jumlahnya!');
      return;
    }
    
    // Validate inputs
    const validInputs = inputs.filter(i => i.item_id && i.qty);
    if (validInputs.length === 0) {
      alert('Minimal 1 bahan pakan harus dipilih!');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        project_id: activeProject.id,
        production_date: productionDate,
        batch_name: batchName,
        notes: notes
      };

      const items = [
        { item_id: targetItemId, type: 'OUTPUT', quantity: Number(targetQty) },
        ...validInputs.map(i => ({ item_id: i.item_id, type: 'INPUT', quantity: Number(i.qty) }))
      ];

      const newProd = await createProduction(payload, items);
      setIsModalOpen(false);
      navigate(`/operations/production/${newProd.id}`);
    } catch (err: any) {
      alert(err.message || 'Gagal membuat draft racikan');
    } finally {
      setIsSaving(false);
    }
  };

  const openModal = () => {
    setBatchName('');
    setTargetItemId('');
    setTargetQty('');
    setNotes('');
    setInputs([{ item_id: '', qty: '' }]);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Racik Pakan</h2>
          <p className="text-sm text-slate-500">Konversi bahan pakan mentah menjadi pakan siap jual/pakai</p>
        </div>
        <button onClick={openModal} className="bg-brand-600 text-white px-4 py-2 rounded-md font-medium flex items-center gap-2 hover:bg-brand-700">
          <Plus className="w-4 h-4" /> Buat Draft Racikan
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Cari batch..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 rounded-md border border-slate-300 text-sm" />
          </div>
        </div>
        
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">No. Produksi</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Tanggal</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Nama Batch</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Hasil Produksi</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Status</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-4 text-slate-500">Memuat data...</td></tr>
            ) : filteredProductions.map(p => {
              const outputItem = p.items?.find((i:any) => i.type === 'OUTPUT');
              return (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-medium text-brand-600">{p.production_number}</td>
                  <td className="px-4 py-3 text-sm text-slate-900">{p.production_date}</td>
                  <td className="px-4 py-3 text-sm text-slate-900">{p.batch_name || '-'}</td>
                  <td className="px-4 py-3">
                    {outputItem ? (
                      <div>
                        <div className="text-sm font-medium text-slate-900">{outputItem.item?.name}</div>
                        <div className="text-xs text-slate-500">{outputItem.quantity} {outputItem.item?.unit}</div>
                      </div>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={p.status === 'Draft' ? 'warning' : p.status === 'Diproses' ? 'success' : 'default'}>
                      {p.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => navigate(`/operations/production/${p.id}`)} className="text-brand-600 hover:text-brand-900">
                      <Eye className="w-5 h-5 mx-auto" />
                    </button>
                  </td>
                </tr>
              )
            })}
            {!loading && filteredProductions.length === 0 && (
              <tr><td colSpan={6} className="text-center py-8 text-slate-500">Tidak ada riwayat racikan pakan.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Draft Racik Pakan">
        <form onSubmit={handleCreate} className="space-y-4 max-h-[80vh] overflow-y-auto px-1">
          <div className="bg-slate-50 p-3 rounded text-sm text-slate-600 mb-4">
            Isi formulir ini untuk membuat Draft Racikan. Pemotongan stok bahan baru akan dilakukan saat Anda meng-klik "Proses Produksi" di halaman Detail.
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Tanggal Produksi</label>
              <input type="date" required value={productionDate} onChange={e => setProductionDate(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Nama Batch (Opsional)</label>
              <input type="text" value={batchName} onChange={e => setBatchName(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Cth: Pakan Layer 100kg" />
            </div>
          </div>

          <div className="border border-slate-200 rounded-md p-4 bg-white space-y-3">
            <h3 className="font-semibold text-slate-800 border-b pb-2">Barang Hasil Racikan</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700">Pilih Pakan Jadi</label>
                <select required value={targetItemId} onChange={e => setTargetItemId(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2">
                  <option value="">-- Pilih Barang Jadi --</option>
                  {pakanJadi.map((i:any) => (
                    <option key={i.item_id} value={i.item_id}>{i.item?.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Jumlah Target</label>
                <input type="number" required min="0.01" step="0.01" value={targetQty} onChange={e => setTargetQty(Number(e.target.value))} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Qty" />
              </div>
            </div>
          </div>

          <div className="border border-slate-200 rounded-md p-4 bg-slate-50 space-y-3">
            <h3 className="font-semibold text-slate-800 border-b pb-2">Bahan Baku Yang Dipakai</h3>
            {inputs.map((input, index) => (
              <div key={index} className="flex gap-2 items-start">
                <div className="flex-1">
                  <select required value={input.item_id} onChange={e => handleInputChange(index, 'item_id', e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                    <option value="">-- Pilih Bahan Pakan --</option>
                    {bahanPakan.map((i:any) => (
                      <option key={i.item_id} value={i.item_id}>{i.item?.name} (Stok: {i.total_quantity})</option>
                    ))}
                  </select>
                </div>
                <div className="w-32">
                  <input type="number" required min="0.01" step="0.01" value={input.qty} onChange={e => handleInputChange(index, 'qty', Number(e.target.value))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Qty Terpakai" />
                </div>
                {inputs.length > 1 && (
                  <button type="button" onClick={() => handleRemoveInput(index)} className="p-2 text-red-500 hover:text-red-700 mt-1">X</button>
                )}
              </div>
            ))}
            <button type="button" onClick={handleAddInput} className="text-sm text-brand-600 font-medium hover:underline">+ Tambah Bahan Lain</button>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Catatan Tambahan</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Opsional" />
          </div>

          <div className="flex justify-end pt-4">
            <button type="submit" disabled={isSaving || !activeProject} className="bg-brand-600 text-white px-4 py-2 rounded-md font-medium hover:bg-brand-700 disabled:opacity-50">
              {isSaving ? 'Menyimpan...' : 'Simpan Draft'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
