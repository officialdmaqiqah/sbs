import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, PlayCircle, CheckCircle, Plus } from 'lucide-react';
import { useProductions } from '../hooks/useProductions';
import { useProductionCosts } from '../hooks/useProductionCosts';
import { useInventoryBalances } from '../hooks/useInventoryBalances';
import { useCashBankAccounts } from '../hooks/useFinance';
import { useAuth } from '../contexts/AuthContext';
import Badge from '../components/Badge';
import Modal from '../components/Modal';

export default function ProductionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  // We need to fetch both types to find the production order since we don't know the type from URL
  const { data: cageProd, loading: cageLoad, processProduction: processCage } = useProductions('CAGE');
  const { data: feedProd, loading: feedLoad, processProduction: processFeed } = useProductions('FEED');
  
  const production = useMemo(() => {
    return cageProd.find(p => p.id === id) || feedProd.find(p => p.id === id);
  }, [cageProd, feedProd, id]);

  const { data: costs, loading: costsLoading, addCost } = useProductionCosts(id);
  const { data: cashBankAccounts } = useCashBankAccounts();
  const { data: inventoryItems } = useInventoryBalances({ projectId: production?.project_id });

  const [isProcessing, setIsProcessing] = useState(false);
  const [isCostModalOpen, setIsCostModalOpen] = useState(false);
  
  // Cost Form State
  const [costDate, setCostDate] = useState(new Date().toISOString().split('T')[0]);
  const [costType, setCostType] = useState('Tenaga Kerja');
  const [amount, setAmount] = useState<number | ''>('');
  const [cashBankId, setCashBankId] = useState('');
  const [costNotes, setCostNotes] = useState('');

  if (cageLoad || feedLoad) return <div className="p-8 text-center text-slate-500">Memuat detail produksi...</div>;
  if (!production) return <div className="p-8 text-center text-red-500">Data produksi tidak ditemukan</div>;

  const isCage = production.type === 'CAGE';
  const processProduction = isCage ? processCage : processFeed;
  const backUrl = isCage ? '/operations/cage-production' : '/operations/feed-mixing';

  const outputItem = production.items?.find((i:any) => i.type === 'OUTPUT');
  const inputItems = production.items?.filter((i:any) => i.type === 'INPUT') || [];

  const handleProcess = async () => {
    // Validate stock
    let stockWarnings = [];
    for (const input of inputItems) {
      const inv = inventoryItems.find((i:any) => i.item_id === input.item_id);
      const stock = inv ? inv.total_quantity : 0;
      if (stock < input.quantity) {
        stockWarnings.push(`${input.item?.name} (Butuh ${input.quantity}, Stok ${stock})`);
      }
    }

    if (stockWarnings.length > 0) {
      const isAdmin = profile?.user_role === 'CEO' || profile?.user_role === 'Admin';
      const warningMsg = `Stok bahan berikut tidak mencukupi:\n- ${stockWarnings.join('\n- ')}`;
      if (isAdmin) {
        if (!confirm(`${warningMsg}\n\nAnda adalah Admin. Lanjutkan potong stok sampai minus?`)) return;
      } else {
        alert(`${warningMsg}\n\nHanya CEO/Admin yang bisa melanjutkan dengan stok kurang.`);
        return;
      }
    } else {
      if (!confirm('Proses produksi sekarang? Stok bahan baku akan dikurangi dan barang hasil akan ditambahkan.')) return;
    }

    setIsProcessing(true);
    try {
      await processProduction(id!, production.project_id, production.items);
      alert('Produksi berhasil diproses!');
    } catch(e:any) {
      alert(e.message);
    }
    setIsProcessing(false);
  };

  const handleAddCost = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      if (!cashBankId) throw new Error('Silakan pilih akun Kas/Bank asal dana');
      
      await addCost({
        project_id: production.project_id,
        production_id: production.id,
        cost_date: costDate,
        cost_type: costType,
        amount: Number(amount),
        cash_bank_id: cashBankId,
        notes: costNotes
      }, production.type);
      setIsCostModalOpen(false);
      setAmount('');
      setCostNotes('');
    } catch(e:any) {
      alert(e.message);
    }
    setIsProcessing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(backUrl)} className="p-2 hover:bg-slate-100 rounded-full">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{production.production_number}</h2>
          <p className="text-sm text-slate-500">Detail Produksi {isCage ? 'Kandang' : 'Pakan'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Informasi Batch</h3>
            <div className="grid grid-cols-2 gap-y-4">
              <div>
                <p className="text-sm text-slate-500">Tanggal Produksi</p>
                <p className="font-medium text-slate-900">{production.production_date}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Nama Batch</p>
                <p className="font-medium text-slate-900">{production.batch_name || '-'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-slate-500">Catatan</p>
                <p className="font-medium text-slate-900">{production.notes || '-'}</p>
              </div>
            </div>
            
            <div className="mt-6 border-t pt-4">
              <h4 className="font-semibold text-slate-800 mb-2 border-b pb-1">Hasil Produksi (Target Masuk)</h4>
              <div className="bg-green-50 p-3 rounded border border-green-200 flex justify-between items-center">
                <span className="font-medium text-green-900">{outputItem?.item?.name}</span>
                <span className="font-bold text-green-700">+{outputItem?.quantity} {outputItem?.item?.unit}</span>
              </div>
            </div>

            <div className="mt-4 border-t pt-4">
              <h4 className="font-semibold text-slate-800 mb-2 border-b pb-1">Bahan Dipakai (Bahan Keluar)</h4>
              <div className="space-y-2">
                {inputItems.map((input:any) => (
                  <div key={input.id} className="bg-red-50 p-3 rounded border border-red-200 flex justify-between items-center">
                    <span className="font-medium text-red-900">{input.item?.name}</span>
                    <span className="font-bold text-red-700">-{input.quantity} {input.item?.unit}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-800">Estimasi Biaya Produksi Sederhana</h3>
              <button onClick={() => setIsCostModalOpen(true)} className="text-brand-600 text-sm font-medium hover:underline flex items-center gap-1">
                <Plus className="w-4 h-4" /> Tambah Biaya
              </button>
            </div>
            
            {costsLoading ? (
              <p className="text-sm text-slate-500">Memuat data biaya...</p>
            ) : costs.length === 0 ? (
              <p className="text-sm text-slate-500 italic">Belum ada catatan biaya tambahan untuk produksi ini.</p>
            ) : (
              <table className="min-w-full divide-y divide-slate-200">
                <thead>
                  <tr>
                    <th className="py-2 text-left text-xs font-medium text-slate-500 uppercase">Tanggal</th>
                    <th className="py-2 text-left text-xs font-medium text-slate-500 uppercase">Jenis / Catatan</th>
                    <th className="py-2 text-left text-xs font-medium text-slate-500 uppercase">Kas Asal</th>
                    <th className="py-2 text-right text-xs font-medium text-slate-500 uppercase">Nominal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {costs.map(c => (
                    <tr key={c.id}>
                      <td className="py-2 text-sm text-slate-600">{c.cost_date}</td>
                      <td className="py-2">
                        <div className="text-sm font-medium text-slate-900">{c.cost_type}</div>
                        <div className="text-xs text-slate-500">{c.notes}</div>
                      </td>
                      <td className="py-2 text-sm text-slate-600">{c.cash_bank?.bank_name}</td>
                      <td className="py-2 text-sm font-bold text-red-600 text-right">- Rp {Number(c.amount).toLocaleString('id-ID')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Status & Aksi</h3>
            
            <div className="mb-6">
              <Badge variant={production.status === 'Diproses' ? 'success' : 'warning'} className="text-sm px-3 py-1">
                Status: {production.status}
              </Badge>
              {production.processed_at && (
                <p className="text-xs text-slate-500 mt-2">Diproses pada: {new Date(production.processed_at).toLocaleString('id-ID')}</p>
              )}
            </div>

            <div className="space-y-3">
              {production.status === 'Draft' ? (
                <button disabled={isProcessing} onClick={handleProcess} className="w-full bg-brand-600 text-white px-4 py-2 rounded-md font-medium flex items-center justify-center gap-2 hover:bg-brand-700 disabled:opacity-50">
                  <PlayCircle className="w-4 h-4" /> Proses Produksi
                </button>
              ) : (
                <div className="p-3 bg-green-50 border border-green-200 rounded text-green-800 text-sm font-medium flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Produksi Selesai
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Modal isOpen={isCostModalOpen} onClose={() => setIsCostModalOpen(false)} title="Tambah Biaya Produksi">
        <form onSubmit={handleAddCost} className="space-y-4">
          <div className="bg-blue-50 p-3 rounded text-sm text-blue-800 mb-4 border border-blue-200">
            Biaya yang dimasukkan di sini akan langsung memotong saldo Kas/Bank secara otomatis.
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Tanggal</label>
              <input type="date" required value={costDate} onChange={e => setCostDate(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Jenis Biaya</label>
              <select required value={costType} onChange={e => setCostType(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2">
                <option value="Tenaga Kerja">Upah / Tenaga Kerja</option>
                <option value="Listrik/Air">Listrik / Air</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Nominal (Rp)</label>
            <input type="number" required value={amount} onChange={e => setAmount(Number(e.target.value))} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Dibayar dari Kas/Bank</label>
            <select required value={cashBankId} onChange={e => setCashBankId(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2">
              <option value="">-- Pilih Rekening --</option>
              {cashBankAccounts?.map(account => (
                <option key={account.id} value={account.id}>{account.bank_name} - {account.account_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Catatan</label>
            <input type="text" value={costNotes} onChange={e => setCostNotes(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
          </div>

          <div className="flex justify-end pt-4">
            <button type="submit" disabled={isProcessing} className="bg-brand-600 text-white px-4 py-2 rounded-md font-medium hover:bg-brand-700 disabled:opacity-50">
              {isProcessing ? 'Menyimpan...' : 'Simpan Biaya'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
