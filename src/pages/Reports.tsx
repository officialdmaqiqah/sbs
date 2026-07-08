import { useState, useEffect } from 'react';
import { db } from '../services/db';
import { supabase } from '../lib/supabase';
import { 
  FileText, 
  ArrowRightCircle, 
  ArrowLeftCircle, 
  BarChart, 
  Scale 
} from 'lucide-react';
import Badge from '../components/Badge';
import { useProject } from '../contexts/ProjectContext';

export default function Reports() {
  const { activeProject, availableProjects } = useProject();
  const [activeTab, setActiveTab] = useState<'arus-kas' | 'laba-rugi' | 'neraca'>('laba-rugi');
  const [projectFilter, setProjectFilter] = useState<string>(activeProject?.id || 'All');
  
  // Data State
  const [reportData, setReportData] = useState<any>({
    arusKas: { masuk: 0, keluar: 0, saldoAwal: 0, saldoAkhir: 0 },
    labaRugi: { pendapatan: 0, hpp: 0, kotor: 0, biaya: 0, bersih: 0 },
    neraca: { aset: 0, kas: 0, piutang: 0, persediaan: 0, hutang: 0, ekuitas: 0 }
  });

  useEffect(() => {
    loadReportData();
  }, [projectFilter]);

  const loadReportData = async () => {
    try {
      const salesOrders = (db as any).getAll('sales_orders') || [];
      const purchaseOrders = (db as any).getAll('purchase_orders') || [];
      const journalLines = (db as any).getAll('journal_entry_lines') || [];
      const accounts = (db as any).getAll('chart_of_accounts') || [];
      const items = (db as any).getAll('items') || [];
      const movements = (db as any).getAll('inventory_movements') || [];

      // HELPER: Get Accounts by Category
      const getAccounts = (categories: string[]) => accounts.filter((a: any) => categories.includes(a.category)).map((a: any) => a.id);
      
      const arAccts = getAccounts(['Accounts Receivable']);
      const apAccts = getAccounts(['Accounts Payable']);
      const invAccts = getAccounts(['Inventory']);
      const revAccts = getAccounts(['Revenue', 'Sales']);
      const cogsAccts = getAccounts(['COGS', 'Cost of Goods Sold']);
      const expAccts = getAccounts(['Expense', 'Operating Expense']);
      const eqAccts = getAccounts(['Equity', 'Retained Earnings']);

      // Calculate Balances
      const getBalance = (accountIds: string[], normalBalance: 'Debit' | 'Credit') => {
        let bal = 0;
        journalLines.forEach((line: any) => {
          if (accountIds.includes(line.account_id)) {
            if (normalBalance === 'Debit') {
              bal += (line.debit || 0) - (line.credit || 0);
            } else {
              bal += (line.credit || 0) - (line.debit || 0);
            }
          }
        });
        return bal;
      };

      // Fetch Cash Bank Mutations from Supabase
      let mutationQuery = supabase.from('cash_bank_mutations').select('*');
      if (projectFilter !== 'All') {
        if (projectFilter === 'Non-Project') {
          mutationQuery = mutationQuery.is('project_id', null);
        } else {
          mutationQuery = mutationQuery.eq('project_id', projectFilter);
        }
      }
      
      const { data: mutationsResult } = await mutationQuery;
      const cashMutations = mutationsResult || [];

      // 1. NERACA (BALANCE SHEET)
      const kasBalance = cashMutations.reduce((sum: number, mut: any) => {
        if (mut.mutation_type === 'IN') return sum + mut.amount;
        if (mut.mutation_type === 'OUT') return sum - mut.amount;
        return sum; // TRANSFER doesn't affect total overall balance
      }, 0);
      
      // Fallback calculations if journal entries are missing (mock)
      let piutangBalance = getBalance(arAccts, 'Debit');
      if (piutangBalance === 0) {
        salesOrders.forEach((so: any) => {
          if (so.status !== 'Cancelled') {
            const total = (so.qty * so.unit_price) - so.discount + so.shipping_cost;
            piutangBalance += (total - (so.down_payment || 0) > 0 ? total - (so.down_payment || 0) : 0);
          }
        });
      }

      let hutangBalance = getBalance(apAccts, 'Credit');
      if (hutangBalance === 0) {
        purchaseOrders.forEach((po: any) => {
          if (po.status !== 'Cancelled') {
            const total = po.total_amount || 0;
            hutangBalance += (total - (po.down_payment || 0) > 0 ? total - (po.down_payment || 0) : 0);
          }
        });
      }

      let persediaanBalance = getBalance(invAccts, 'Debit');
      if (persediaanBalance === 0) {
        items.forEach((item: any) => {
          const qty = movements.filter((m: any) => m.item_id === item.id).reduce((sum: number, m: any) => sum + (m.direction === 'IN' ? m.quantity : m.direction === 'OUT' ? -m.quantity : 0), 0);
          persediaanBalance += (qty > 0 ? qty : 0) * (item.category === 'Ayam' ? 50000 : 10000); // Mock cost
        });
      }

      const totalAset = kasBalance + piutangBalance + persediaanBalance;
      const ekuitasBalance = getBalance(eqAccts, 'Credit') || (totalAset - hutangBalance); // Plug figure for simple view

      // 2. LABA RUGI (PROFIT & LOSS)
      let pendapatan = getBalance(revAccts, 'Credit');
      if (pendapatan === 0) {
        salesOrders.forEach((so: any) => {
          if (so.status !== 'Cancelled') {
            pendapatan += (so.qty * so.unit_price) - so.discount + so.shipping_cost;
          }
        });
      }

      let hpp = getBalance(cogsAccts, 'Debit');
      if (hpp === 0) {
        purchaseOrders.forEach((po: any) => {
          if (po.status !== 'Cancelled') {
            hpp += (po.total_amount || 0);
          }
        });
      }

      let biaya = getBalance(expAccts, 'Debit');
      // mock if empty
      if (biaya === 0) biaya = pendapatan * 0.15; // 15% as mock operational cost

      const labaKotor = pendapatan - hpp;
      const labaBersih = labaKotor - biaya;

      // 3. ARUS KAS (CASH FLOW) - Source of truth: cash_bank_mutations
      let kasMasuk = cashMutations.filter((m: any) => m.mutation_type === 'IN').reduce((sum: number, m: any) => sum + m.amount, 0);
      let kasKeluar = cashMutations.filter((m: any) => m.mutation_type === 'OUT').reduce((sum: number, m: any) => sum + m.amount, 0);
      const modalInvestasi = cashMutations.filter((m: any) => m.source_module === 'PROJECT_CAPITAL' && m.mutation_type === 'IN').reduce((sum: number, m: any) => sum + m.amount, 0);

      const saldoAwal = kasBalance - kasMasuk + kasKeluar; 

      setReportData({
        arusKas: { masuk: kasMasuk, keluar: kasKeluar, saldoAwal: Math.max(saldoAwal, 0), saldoAkhir: kasBalance, modalInvestasi },
        labaRugi: { pendapatan, hpp, kotor: labaKotor, biaya, bersih: labaBersih },
        neraca: { aset: totalAset, kas: kasBalance, piutang: piutangBalance, persediaan: persediaanBalance, hutang: hutangBalance, ekuitas: ekuitasBalance, modalInvestasi }
      });
    } catch (e) {
      console.error("Failed to load report data", e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="pb-5 border-b border-slate-200">
        <h3 className="text-2xl font-bold leading-6 text-slate-900">Laporan Keuangan & Operasional</h3>
        <p className="mt-2 max-w-4xl text-sm text-slate-500">Pantau kesehatan finansial usaha Anda dengan mudah melalui laporan yang disederhanakan.</p>
      </div>

      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          <button onClick={() => setActiveTab('laba-rugi')} className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${activeTab === 'laba-rugi' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'}`}>Laba Rugi</button>
          <button onClick={() => setActiveTab('arus-kas')} className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${activeTab === 'arus-kas' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'}`}>Arus Kas</button>
          <button onClick={() => setActiveTab('neraca')} className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${activeTab === 'neraca' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'}`}>Neraca</button>
        </nav>
        
        {/* Project Filter for Reports */}
        <div className="py-3 px-1">
          <select 
            className="border border-brand-200 rounded-md p-2 text-sm bg-brand-50 text-brand-700 font-medium"
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
          >
            <option value="All">Semua Project (Global)</option>
            <option value="Non-Project">Non-Project</option>
            {availableProjects.map(p => (
              <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* LABA RUGI */}
      {activeTab === 'laba-rugi' && (
        <div className="max-w-4xl">
          <div className="bg-white shadow-sm border border-slate-200 rounded-xl overflow-hidden">
            <div className="p-6 bg-brand-50 border-b border-brand-100 flex justify-between items-center">
              <div>
                <h4 className="text-lg font-bold text-brand-900 flex items-center gap-2"><BarChart className="w-5 h-5"/> Laporan Laba Rugi</h4>
                <p className="text-sm text-brand-700">Estimasi — perhitungan sederhana untuk monitoring awal UMKM</p>
              </div>
              <Badge variant={reportData.labaRugi.bersih >= 0 ? 'success' : 'danger'}>
                {reportData.labaRugi.bersih >= 0 ? 'PROFIT' : 'RUGI'}
              </Badge>
            </div>
            <div className="p-0">
              <table className="min-w-full">
                <tbody className="divide-y divide-slate-100">
                  <tr className="bg-white hover:bg-slate-50">
                    <td className="py-4 pl-6 text-sm font-medium text-slate-900">Pendapatan Penjualan</td>
                    <td className="py-4 pr-6 text-sm text-slate-900 text-right">Rp {reportData.labaRugi.pendapatan.toLocaleString('id-ID')}</td>
                  </tr>
                  <tr className="bg-white hover:bg-slate-50">
                    <td className="py-4 pl-6 text-sm text-slate-600 pl-10">Harga Pokok Penjualan (HPP / Pembelian)</td>
                    <td className="py-4 pr-6 text-sm text-red-600 text-right">- Rp {reportData.labaRugi.hpp.toLocaleString('id-ID')}</td>
                  </tr>
                  <tr className="bg-slate-50 border-t border-slate-200">
                    <td className="py-4 pl-6 text-sm font-bold text-slate-900">Laba Kotor</td>
                    <td className="py-4 pr-6 text-sm font-bold text-slate-900 text-right">Rp {reportData.labaRugi.kotor.toLocaleString('id-ID')}</td>
                  </tr>
                  <tr className="bg-white hover:bg-slate-50">
                    <td className="py-4 pl-6 text-sm text-slate-600 pl-10">Biaya Operasional & Pengeluaran Lainnya</td>
                    <td className="py-4 pr-6 text-sm text-red-600 text-right">- Rp {reportData.labaRugi.biaya.toLocaleString('id-ID')}</td>
                  </tr>
                  <tr className={`border-t-2 ${reportData.labaRugi.bersih >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                    <td className={`py-5 pl-6 text-base font-bold ${reportData.labaRugi.bersih >= 0 ? 'text-emerald-900' : 'text-red-900'}`}>Laba Bersih</td>
                    <td className={`py-5 pr-6 text-lg font-bold text-right ${reportData.labaRugi.bersih >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>Rp {reportData.labaRugi.bersih.toLocaleString('id-ID')}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ARUS KAS */}
      {activeTab === 'arus-kas' && (
        <div className="max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white shadow-sm border border-slate-200 p-6 rounded-xl">
              <h4 className="text-sm font-medium text-slate-500 mb-1">Kas Masuk</h4>
              <p className="text-2xl font-bold text-emerald-600 flex items-center gap-2"><ArrowLeftCircle className="w-6 h-6"/> Rp {reportData.arusKas.masuk.toLocaleString('id-ID')}</p>
            </div>
            <div className="bg-white shadow-sm border border-slate-200 p-6 rounded-xl">
              <h4 className="text-sm font-medium text-slate-500 mb-1">Kas Keluar</h4>
              <p className="text-2xl font-bold text-red-600 flex items-center gap-2"><ArrowRightCircle className="w-6 h-6"/> Rp {reportData.arusKas.keluar.toLocaleString('id-ID')}</p>
            </div>
          </div>
          
          <div className="bg-white shadow-sm border border-slate-200 rounded-xl overflow-hidden">
            <div className="p-6 bg-slate-50 border-b border-slate-200">
              <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2"><FileText className="w-5 h-5"/> Ringkasan Arus Kas</h4>
            </div>
            <div className="p-0">
              <table className="min-w-full">
                <tbody className="divide-y divide-slate-100">
                  <tr className="bg-white">
                    <td className="py-4 pl-6 text-sm font-medium text-slate-900">Saldo Awal</td>
                    <td className="py-4 pr-6 text-sm text-slate-900 text-right">Rp {reportData.arusKas.saldoAwal.toLocaleString('id-ID')}</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="py-4 pl-6 text-sm text-slate-600">Total Pemasukan</td>
                    <td className="py-4 pr-6 text-sm text-emerald-600 text-right">+ Rp {reportData.arusKas.masuk.toLocaleString('id-ID')}</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="py-2 pl-12 text-xs text-slate-500">└ Pemasukan Modal / Pinjaman</td>
                    <td className="py-2 pr-6 text-xs text-slate-500 text-right">Rp {reportData.arusKas.modalInvestasi.toLocaleString('id-ID')}</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="py-2 pl-12 text-xs text-slate-500">└ Pemasukan Operasional</td>
                    <td className="py-2 pr-6 text-xs text-slate-500 text-right">Rp {(reportData.arusKas.masuk - reportData.arusKas.modalInvestasi).toLocaleString('id-ID')}</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="py-4 pl-6 text-sm text-slate-600">Total Pengeluaran</td>
                    <td className="py-4 pr-6 text-sm text-red-600 text-right">- Rp {reportData.arusKas.keluar.toLocaleString('id-ID')}</td>
                  </tr>
                  <tr className="bg-blue-50 border-t-2 border-blue-200">
                    <td className="py-5 pl-6 text-base font-bold text-blue-900">Saldo Akhir (Kas & Bank)</td>
                    <td className="py-5 pr-6 text-lg font-bold text-right text-blue-700">Rp {reportData.arusKas.saldoAkhir.toLocaleString('id-ID')}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* NERACA */}
      {activeTab === 'neraca' && (
        <div className="max-w-4xl">
          <div className="bg-white shadow-sm border border-slate-200 rounded-xl overflow-hidden">
            <div className="p-6 bg-slate-800 text-white flex justify-between items-center">
              <div>
                <h4 className="text-lg font-bold flex items-center gap-2"><Scale className="w-5 h-5"/> Laporan Neraca (Posisi Keuangan)</h4>
                <p className="text-sm text-slate-400 mt-1">Ringkasan awal — perlu validasi saldo awal</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
              {/* ASET */}
              <div className="p-0">
                <div className="p-4 bg-slate-50 border-b border-slate-200">
                  <h5 className="font-bold text-slate-900">ASET (HARTA)</h5>
                </div>
                <table className="min-w-full">
                  <tbody className="divide-y divide-slate-100">
                    <tr className="bg-white">
                      <td className="py-3 pl-4 text-sm text-slate-700">Kas & Bank</td>
                      <td className="py-3 pr-4 text-sm text-slate-900 text-right">Rp {reportData.neraca.kas.toLocaleString('id-ID')}</td>
                    </tr>
                    <tr className="bg-white">
                      <td className="py-3 pl-4 text-sm text-slate-700">Piutang Pelanggan</td>
                      <td className="py-3 pr-4 text-sm text-slate-900 text-right">Rp {reportData.neraca.piutang.toLocaleString('id-ID')}</td>
                    </tr>
                    <tr className="bg-white">
                      <td className="py-3 pl-4 text-sm text-slate-700">Persediaan Barang & Ayam</td>
                      <td className="py-3 pr-4 text-sm text-slate-900 text-right">Rp {reportData.neraca.persediaan.toLocaleString('id-ID')}</td>
                    </tr>
                    <tr className="bg-slate-100 border-t border-slate-200">
                      <td className="py-4 pl-4 text-sm font-bold text-slate-900">TOTAL ASET</td>
                      <td className="py-4 pr-4 text-sm font-bold text-slate-900 text-right">Rp {reportData.neraca.aset.toLocaleString('id-ID')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* KEWAJIBAN & EKUITAS */}
              <div className="p-0 flex flex-col justify-between">
                <div>
                  <div className="p-4 bg-slate-50 border-b border-slate-200">
                    <h5 className="font-bold text-slate-900">KEWAJIBAN & MODAL</h5>
                  </div>
                  <table className="min-w-full">
                    <tbody className="divide-y divide-slate-100">
                      <tr className="bg-white">
                        <td className="py-3 pl-4 text-sm font-medium text-slate-900">Kewajiban</td>
                        <td className="py-3 pr-4 text-sm text-slate-900 text-right"></td>
                      </tr>
                      <tr className="bg-white">
                        <td className="py-3 pl-4 text-sm text-slate-700 pl-8">Hutang Usaha (Supplier)</td>
                        <td className="py-3 pr-4 text-sm text-slate-900 text-right">Rp {reportData.neraca.hutang.toLocaleString('id-ID')}</td>
                      </tr>
                      <tr className="bg-white">
                        <td className="py-3 pl-4 text-sm font-medium text-slate-900">Modal (Ekuitas)</td>
                        <td className="py-3 pr-4 text-sm text-slate-900 text-right"></td>
                      </tr>
                      <tr className="bg-white">
                        <td className="py-3 pl-4 text-sm text-slate-700 pl-8">Modal Investor / Pinjaman Masuk</td>
                        <td className="py-3 pr-4 text-sm text-slate-900 text-right">Rp {reportData.neraca.modalInvestasi.toLocaleString('id-ID')}</td>
                      </tr>
                      <tr className="bg-white">
                        <td className="py-3 pl-4 text-sm text-slate-700 pl-8">Modal Netto / Laba Ditahan</td>
                        <td className="py-3 pr-4 text-sm text-slate-900 text-right">Rp {(reportData.neraca.ekuitas - reportData.neraca.modalInvestasi).toLocaleString('id-ID')}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <table className="min-w-full">
                  <tbody>
                    <tr className="bg-slate-100 border-t border-slate-200">
                      <td className="py-4 pl-4 text-sm font-bold text-slate-900">TOTAL KEWAJIBAN & MODAL</td>
                      <td className="py-4 pr-4 text-sm font-bold text-slate-900 text-right">Rp {(reportData.neraca.hutang + reportData.neraca.ekuitas).toLocaleString('id-ID')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            {/* Validation */}
            <div className={`p-3 text-center text-xs font-bold ${reportData.neraca.aset === (reportData.neraca.hutang + reportData.neraca.ekuitas) ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
              {reportData.neraca.aset === (reportData.neraca.hutang + reportData.neraca.ekuitas) ? 'NERACA SEIMBANG (BALANCE)' : 'NERACA TIDAK SEIMBANG'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
