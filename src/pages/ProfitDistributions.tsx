import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Building, Users, Coins, HeartHandshake, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProfitDistributions() {
  const [closings, setClosings] = useState<any[]>([]);
  const [selectedClosing, setSelectedClosing] = useState<any | null>(null);
  const [distributions, setDistributions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('project_closings')
        .select(`
          *,
          projects:project_id (
            code,
            name
          )
        `)
        .order('closing_date', { ascending: false });

      if (error) throw error;
      setClosings(data || []);
    } catch (err: any) {
      toast.error('Gagal memuat data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectClosing = async (closing: any) => {
    setSelectedClosing(closing);
    setLoadingDetails(true);
    try {
      const { data, error } = await supabase
        .from('project_profit_distributions')
        .select('*')
        .eq('project_closing_id', closing.id)
        .order('recipient_role', { ascending: true });
        
      if (error) throw error;
      setDistributions(data || []);
    } catch (err: any) {
      toast.error('Gagal memuat detail bagi hasil: ' + err.message);
    } finally {
      setLoadingDetails(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Laporan Bagi Hasil</h1>
          <p className="text-slate-500">Arsip riwayat pembagian profit dari project yang sudah selesai (Tutup Buku).</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar Kiri: Daftar Closing */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[800px]">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h2 className="font-bold text-slate-800">Riwayat Tutup Buku</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {loading ? (
              <div className="text-center py-10 text-slate-500">Memuat data...</div>
            ) : closings.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-sm">Belum ada riwayat tutup buku.</div>
            ) : (
              closings.map(c => (
                <button 
                  key={c.id}
                  onClick={() => selectClosing(c)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedClosing?.id === c.id ? 'bg-brand-50 border-brand-200' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                >
                  <div className="font-semibold text-slate-900 text-sm">
                    {c.projects?.code} - {c.projects?.name}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Tanggal: {c.closing_date}</div>
                  <div className="text-xs font-medium mt-1 text-emerald-600">
                    Laba: Rp {(c.gross_profit || 0).toLocaleString('id-ID')}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Panel Kanan: Detail Bagi Hasil */}
        <div className="lg:col-span-2 space-y-6">
          {selectedClosing ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Rincian Laba & Bagi Hasil</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Project: <span className="font-semibold">{selectedClosing.projects?.name}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-200 text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4" /> Final
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2 mb-1"><Building className="w-4 h-4 text-slate-500"/><h3 className="text-xs font-semibold text-slate-500 uppercase">Kas (10%)</h3></div>
                  <p className="text-lg font-bold text-slate-900 mt-1">Rp {(selectedClosing.company_cash_share || 0).toLocaleString('id-ID')}</p>
                </div>
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2 mb-1"><Users className="w-4 h-4 text-slate-500"/><h3 className="text-xs font-semibold text-slate-500 uppercase">Pekerja (45%)</h3></div>
                  <p className="text-lg font-bold text-slate-900 mt-1">Rp {(selectedClosing.worker_pool || 0).toLocaleString('id-ID')}</p>
                </div>
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2 mb-1"><Coins className="w-4 h-4 text-slate-500"/><h3 className="text-xs font-semibold text-slate-500 uppercase">Investor (45%)</h3></div>
                  <p className="text-lg font-bold text-slate-900 mt-1">Rp {(selectedClosing.investor_pool || 0).toLocaleString('id-ID')}</p>
                </div>
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2 mb-1"><HeartHandshake className="w-4 h-4 text-slate-500"/><h3 className="text-xs font-semibold text-slate-500 uppercase">CSR (10%)</h3></div>
                  <p className="text-lg font-bold text-slate-900 mt-1">Rp {(selectedClosing.csr_pool || 0).toLocaleString('id-ID')}</p>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Tabel Distribusi Penerima</h3>
                
                {loadingDetails ? (
                  <div className="text-center py-6 text-slate-500">Memuat rincian penerima...</div>
                ) : (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="min-w-full text-left text-sm text-slate-600">
                      <thead className="bg-slate-50 text-slate-900">
                        <tr>
                          <th className="px-4 py-3 font-medium">Penerima</th>
                          <th className="px-4 py-3 font-medium">Peran</th>
                          <th className="px-4 py-3 font-medium text-right">Modal (%)</th>
                          <th className="px-4 py-3 font-medium text-right">Nominal Rp</th>
                          <th className="px-4 py-3 font-medium text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {distributions.map(d => (
                          <tr key={d.id}>
                            <td className="px-4 py-3 font-medium text-slate-900">{d.recipient_name}</td>
                            <td className="px-4 py-3">{d.recipient_role}</td>
                            <td className="px-4 py-3 text-right">
                              {d.capital_amount > 0 ? `${(d.capital_percentage || 0).toFixed(1)}%` : '-'}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-brand-700">
                              Rp {(d.total_share || 0).toLocaleString('id-ID')}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
                                {d.payment_status}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {distributions.length === 0 && (
                          <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Data rincian distribusi tidak ditemukan.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
                
                <p className="mt-4 text-xs text-slate-400 bg-slate-50 p-3 rounded-lg">
                  Catatan: Halaman ini hanya menampilkan data arsip hasil akhir dari proses Tutup Buku. Untuk melakukan pencairan / pembayaran fisik dari kas perusahaan ke masing-masing rekening penerima akan difasilitasi di fase pengembangan berikutnya.
                </p>
              </div>

            </div>
          ) : (
            <div className="h-full flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-400">
              Pilih project di daftar sebelah kiri untuk melihat rincian laba & bagi hasil.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
