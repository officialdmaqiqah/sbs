import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjectClosing } from '../hooks/useProjectClosing';
import type { ReadinessCheck, ClosingCalculation } from '../hooks/useProjectClosing';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle, CheckCircle, Printer, ArrowLeft } from 'lucide-react';
import Badge from '../components/Badge';
import { useProject } from '../contexts/ProjectContext';

export default function ProjectClosing() {
  const { id: urlId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { activeProject } = useProject();
  
  const id = urlId || activeProject?.id;

  const { checkReadiness, calculateProfit, saveClosing, getExistingClosing, loading, error } = useProjectClosing(id);

  const [project, setProject] = useState<any>(null);
  const [readiness, setReadiness] = useState<ReadinessCheck | null>(null);
  const [calculation, setCalculation] = useState<ClosingCalculation | null>(null);
  const [existingClosing, setExistingClosing] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function init() {
      if (!id) return;
      const { data: proj } = await supabase.from('projects').select('*').eq('id', id).single();
      setProject(proj);

      const existing = await getExistingClosing();
      if (existing) {
        setExistingClosing(existing);
      } else {
        const r = await checkReadiness();
        setReadiness(r);
        const calc = await calculateProfit();
        setCalculation(calc);
      }
    }
    init();
  }, [id]);

  const handleSave = async () => {
    if (!calculation) return;
    if (readiness && (!readiness.isReady || readiness.hasReceivables || readiness.hasPayables)) {
      if (!confirm('Masih ada warning pada readiness check. Anda yakin ingin menutup project ini sekarang? (Tindakan ini tidak bisa dibatalkan)')) {
        return;
      }
    } else {
      if (!confirm('Anda yakin ingin memfinalisasi Tutup Buku? Semua data akan dikunci.')) {
        return;
      }
    }

    setIsSaving(true);
    const success = await saveClosing(calculation);
    if (success) {
      alert('Tutup Buku berhasil disimpan!');
      const existing = await getExistingClosing();
      setExistingClosing(existing);
    } else {
      alert('Gagal menyimpan tutup buku: ' + error);
    }
    setIsSaving(false);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!id) return <div className="p-8 text-center text-slate-500">Silakan pilih Project Aktif dari menu dropdown di atas terlebih dahulu.</div>;
  if (!project) return <div className="p-8 text-center">Memuat Project...</div>;

  const isAdminOrCEO = profile?.role === 'CEO_ADMIN';

  // If already closed
  if (existingClosing) {
    return (
      <div className="space-y-6 print:m-0 print:p-0">
        <div className="flex justify-between items-center print:hidden">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/projects')} className="p-2 hover:bg-slate-100 rounded-full">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Laporan Tutup Buku: {project.name}</h2>
              <p className="text-sm text-slate-500">Project Code: {project.code}</p>
            </div>
          </div>
          <button onClick={handlePrint} className="bg-slate-800 text-white px-4 py-2 rounded-md font-medium flex items-center gap-2 hover:bg-slate-900">
            <Printer className="w-4 h-4" /> Print Laporan
          </button>
        </div>

        {/* Print Header */}
        <div className="hidden print:block text-center mb-8 border-b pb-4">
          <h1 className="text-2xl font-bold text-slate-900">LAPORAN TUTUP BUKU PROJECT</h1>
          <h2 className="text-xl font-semibold text-slate-800">{project.name} ({project.code})</h2>
          <p className="text-sm text-slate-600 mt-1">Tanggal Tutup Buku: {new Date(existingClosing.closing_date).toLocaleDateString('id-ID')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 border-b pb-2 mb-4">Ringkasan Finansial</h3>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Total Uang Masuk / Penjualan</span>
                <span className="font-medium text-slate-900">Rp {(calculation?.totalSales || 0).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Total Pengeluaran / Biaya</span>
                <span className="font-medium text-slate-900">Rp {(calculation?.totalCosts || 0).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-base font-bold pt-2 border-t">
                <span className="text-slate-800">Profit Kotor</span>
                <span className="text-green-700">Rp {Number(existingClosing.gross_profit).toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 border-b pb-2 mb-4">Alokasi Pool</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Kas Perusahaan (10%)</span>
                <span className="font-medium text-slate-900">Rp {Number(existingClosing.company_cash_share).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Dana CSR (10% dari sisa)</span>
                <span className="font-medium text-slate-900">Rp {Number(existingClosing.csr_pool).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Pool Pekerja (45% dari sisa)</span>
                <span className="font-medium text-slate-900">Rp {Number(existingClosing.worker_pool).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Pool Investor (45% dari sisa)</span>
                <span className="font-medium text-slate-900">Rp {Number(existingClosing.investor_pool).toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800">Detail Bagi Hasil</h3>
            <p className="text-sm text-slate-500 print:hidden">Pembayaran bagi hasil fisik dari kas akan dibuat di fase berikutnya jika dibutuhkan. Saat ini sistem mencatat snapshot kewajiban.</p>
          </div>
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Penerima</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Peran</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Modal (%)</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Bagian Pekerja</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Bagian Investor</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-slate-800 uppercase">Total Diterima</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase print:hidden">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {existingClosing.distributions.map((d: any) => (
                <tr key={d.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{d.recipient_name}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{d.recipient_role}</td>
                  <td className="px-4 py-3 text-sm text-right text-slate-600">
                    {d.capital_amount > 0 ? `Rp ${Number(d.capital_amount).toLocaleString('id-ID')} (${Number(d.capital_percentage).toFixed(1)}%)` : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-slate-600">{d.worker_share > 0 ? `Rp ${Number(d.worker_share).toLocaleString('id-ID')}` : '-'}</td>
                  <td className="px-4 py-3 text-sm text-right text-slate-600">{d.investor_share > 0 ? `Rp ${Number(d.investor_share).toLocaleString('id-ID')}` : '-'}</td>
                  <td className="px-4 py-3 text-sm text-right font-bold text-brand-700">Rp {Number(d.total_share).toLocaleString('id-ID')}</td>
                  <td className="px-4 py-3 text-center print:hidden">
                    <Badge variant={d.payment_status === 'Belum Dibayar' ? 'warning' : 'success'}>{d.payment_status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="hidden print:flex mt-16 justify-between px-12">
          <div className="text-center">
            <p className="mb-20 font-medium">Dibuat Oleh (Finance)</p>
            <p className="border-t border-slate-400 pt-2 w-48 mx-auto">(...................................)</p>
          </div>
          <div className="text-center">
            <p className="mb-20 font-medium">Diketahui Oleh (Perwakilan Tim)</p>
            <p className="border-t border-slate-400 pt-2 w-48 mx-auto">(...................................)</p>
          </div>
          <div className="text-center">
            <p className="mb-20 font-medium">Disetujui Oleh (CEO)</p>
            <p className="border-t border-slate-400 pt-2 w-48 mx-auto">(...................................)</p>
          </div>
        </div>

      </div>
    );
  }

  // Not Closed Yet

  if (loading) return <div className="p-8 text-center">Menghitung data closing...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/projects')} className="p-2 hover:bg-slate-100 rounded-full">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Tutup Buku Project</h2>
          <p className="text-sm text-slate-500">Hitung profit dan bagi hasil untuk project {project.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Closing Readiness</h3>
            
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                {readiness?.hasDraftOrders ? <AlertCircle className="w-5 h-5 text-red-500 shrink-0" /> : <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />}
                <div>
                  <p className="text-sm font-medium text-slate-900">Order Draft</p>
                  <p className="text-xs text-slate-500">{readiness?.hasDraftOrders ? 'Ada order yang belum diproses' : 'Semua order sudah diproses'}</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                {readiness?.hasPendingShipments ? <AlertCircle className="w-5 h-5 text-red-500 shrink-0" /> : <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />}
                <div>
                  <p className="text-sm font-medium text-slate-900">Pengiriman Pending</p>
                  <p className="text-xs text-slate-500">{readiness?.hasPendingShipments ? 'Ada barang masih di jalan' : 'Semua pengiriman selesai'}</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                {readiness?.hasNegativeStock ? <AlertCircle className="w-5 h-5 text-red-500 shrink-0" /> : <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />}
                <div>
                  <p className="text-sm font-medium text-slate-900">Stok Minus</p>
                  <p className="text-xs text-slate-500">{readiness?.hasNegativeStock ? 'Ada stok fisik yang minus' : 'Semua stok wajar'}</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                {readiness?.hasReceivables ? <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0" /> : <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />}
                <div>
                  <p className="text-sm font-medium text-slate-900">Piutang Pelanggan</p>
                  <p className="text-xs text-slate-500">{readiness?.hasReceivables ? 'Warning: Masih ada nota belum lunas' : 'Semua piutang tertagih'}</p>
                </div>
              </li>
            </ul>

            <div className="mt-6 pt-4 border-t">
              <Badge variant={readiness?.isReady ? 'success' : 'warning'} className="w-full justify-center text-sm py-2">
                {readiness?.isReady ? 'Siap Tutup Buku' : 'Perlu Dicek Manual'}
              </Badge>
            </div>
          </div>

          <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
            <p className="text-xs text-slate-500 mb-4 text-center">
              "Estimasi — gunakan untuk monitoring UMKM. Jika data belum sempurna, Anda tetap dapat menutup buku secara paksa sebagai Admin."
            </p>
            {isAdminOrCEO ? (
              <button 
                onClick={handleSave} 
                disabled={isSaving || !calculation} 
                className="w-full bg-brand-600 text-white px-4 py-3 rounded-md font-bold hover:bg-brand-700 disabled:opacity-50"
              >
                {isSaving ? 'Menyimpan...' : 'Finalisasi & Tutup Buku'}
              </button>
            ) : (
              <div className="bg-orange-100 text-orange-800 p-3 rounded text-sm text-center font-medium">
                Hanya CEO / Admin yang dapat memfinalisasi Tutup Buku
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
              <h3 className="text-sm font-medium text-slate-500 mb-1">Total Uang Masuk (Penjualan)</h3>
              <p className="text-2xl font-bold text-slate-900">Rp {(calculation?.totalSales || 0).toLocaleString('id-ID')}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
              <h3 className="text-sm font-medium text-slate-500 mb-1">Total Uang Keluar (Biaya)</h3>
              <p className="text-2xl font-bold text-slate-900">Rp {(calculation?.totalCosts || 0).toLocaleString('id-ID')}</p>
            </div>
          </div>

          <div className="bg-brand-50 p-6 rounded-lg border border-brand-200 text-center">
            <h3 className="text-sm font-medium text-brand-800 mb-1">Estimasi Profit Kotor</h3>
            <p className="text-4xl font-bold text-brand-900">Rp {(calculation?.grossProfit || 0).toLocaleString('id-ID')}</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-semibold text-slate-800">Simulasi Bagi Hasil</h3>
              <Badge variant="default">Aturan SBS</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Penerima</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Peran</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Modal (%)</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-800 uppercase">Estimasi Diterima</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {calculation?.distributions.map((d: any, i: number) => (
                    <tr key={i}>
                      <td className="px-4 py-3 font-medium text-slate-900">{d.recipient_name}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{d.recipient_role}</td>
                      <td className="px-4 py-3 text-sm text-right text-slate-600">
                        {d.capital_amount > 0 ? `Rp ${d.capital_amount.toLocaleString('id-ID')} (${d.capital_percentage.toFixed(1)}%)` : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-brand-700">Rp {d.total_share.toLocaleString('id-ID')}</td>
                    </tr>
                  ))}
                  {(!calculation?.distributions || calculation.distributions.length === 0) && (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-slate-500">Belum ada data perhitungan</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
