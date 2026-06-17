import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  Wallet, 
  Package, 
  ArrowDownRight, 
  ArrowUpRight, 
  TrendingUp, 
  BarChart3,
  ShoppingCart,
  Box,
  Receipt,
  DollarSign
} from 'lucide-react';

export default function Dashboard() {
  const { profile } = useAuth();
  const [metrics, setMetrics] = useState({
    saldoKas: 0,
    nilaiStok: 0,
    hutangSupplier: 0,
    piutangCustomer: 0,
    penjualanBulanIni: 0,
    labaRugiBulanIni: 0
  });
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    if (profile?.organization_id && profile?.role) {
      if (profile.role === 'FINANCE' || profile.role === 'MARKETING') {
        navigate('/sales/orders');
      } else if (profile.role === 'PRODUKSI') {
        navigate('/inventory');
      } else if (profile.role === 'DISTRIBUSI' || profile.role === 'WAREHOUSE') {
        navigate('/distribution/shipments');
      } else if (profile.role === 'INVESTOR') {
        navigate('/reports/pl');
      } else {
        loadDashboardData();
      }
    }
  }, [profile]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const orgId = profile!.organization_id;
      
      // 1. Saldo Kas/Bank (Sum of all cash IN minus OUT)
      const { data: muts } = await supabase
        .from('cash_bank_mutations')
        .select('mutation_type, amount')
        .eq('organization_id', orgId);
        
      let saldoKas = 0;
      muts?.forEach(m => {
        if (m.mutation_type === 'IN') saldoKas += Number(m.amount);
        if (m.mutation_type === 'OUT') saldoKas -= Number(m.amount);
      });

      // 2. Nilai Stok (Simplified: Qty * mock cost)
      const { data: inventory } = await supabase
        .from('inventory_balances')
        .select('total_quantity, items(category)')
        .eq('organization_id', orgId);
        
      let nilaiStok = 0;
      inventory?.forEach(inv => {
        const cat = (inv as any).items?.category;
        const mockCost = cat === 'Ayam' ? 50000 : cat === 'Pakan Jadi' ? 7000 : 10000;
        nilaiStok += (inv.total_quantity > 0 ? inv.total_quantity : 0) * mockCost;
      });

      // 3. Piutang Customer & Penjualan Bulan Ini
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const { data: sales } = await supabase
        .from('sales_orders')
        .select('total_amount, payment_status, status, created_at')
        .eq('organization_id', orgId)
        .neq('status', 'Dibatalkan');

      let piutangCustomer = 0;
      let penjualanBulanIni = 0;
      
      sales?.forEach(s => {
        const total = Number(s.total_amount || 0);
        if (s.payment_status === 'Belum Lunas') {
          piutangCustomer += total; // Assumes 0 paid for simplicity in MVP
        }
        
        const d = new Date(s.created_at);
        if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
          penjualanBulanIni += total;
        }
      });

      // 4. Estimasi Laba/Rugi Bulan Ini (Penjualan - Pengeluaran OUT)
      let pengeluaranBulanIni = 0;
      muts?.forEach(m => {
        if (m.mutation_type === 'OUT') {
          // Since we don't have created_at in our muts query above, let's just do a rough estimate or fetch it
        }
      });
      // Better way:
      const { data: expenses } = await supabase
        .from('cash_bank_mutations')
        .select('amount, created_at')
        .eq('organization_id', orgId)
        .eq('mutation_type', 'OUT');
        
      expenses?.forEach(e => {
        const d = new Date(e.created_at);
        if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
          pengeluaranBulanIni += Number(e.amount || 0);
        }
      });
      
      const labaRugiBulanIni = penjualanBulanIni - pengeluaranBulanIni;

      // 5. Hutang Supplier
      const { data: purchases } = await supabase
        .from('purchase_orders')
        .select('total_amount, status')
        .eq('organization_id', orgId)
        .neq('status', 'Cancelled');
        
      let hutangSupplier = 0;
      purchases?.forEach(() => {
        // Simplified: assuming if it exists it might be unpaid. MVP doesn't have AP payment tracking fully enabled yet.
        // We'll leave it 0 or mock it if needed.
      });

      setMetrics({
        saldoKas,
        nilaiStok,
        hutangSupplier,
        piutangCustomer,
        penjualanBulanIni,
        labaRugiBulanIni
      });

    } catch (e) {
      console.error("Failed to load dashboard metrics", e);
    } finally {
      setLoading(false);
    }
  };

  const cards = [
    { name: 'Uang Saat Ini', stat: `Rp ${metrics.saldoKas.toLocaleString('id-ID')}`, icon: Wallet, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { name: 'Nilai Stok', stat: `Rp ${metrics.nilaiStok.toLocaleString('id-ID')}`, icon: Package, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { name: 'Hutang', stat: `Rp ${metrics.hutangSupplier.toLocaleString('id-ID')}`, icon: ArrowUpRight, color: 'text-rose-500', bg: 'bg-rose-500/10' },
    { name: 'Piutang', stat: `Rp ${metrics.piutangCustomer.toLocaleString('id-ID')}`, icon: ArrowDownRight, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { name: 'Penjualan Bulan Ini', stat: `Rp ${metrics.penjualanBulanIni.toLocaleString('id-ID')}`, icon: TrendingUp, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { name: 'Estimasi Laba/Rugi', stat: `Rp ${metrics.labaRugiBulanIni.toLocaleString('id-ID')}`, icon: BarChart3, color: metrics.labaRugiBulanIni >= 0 ? 'text-emerald-500' : 'text-rose-500', bg: metrics.labaRugiBulanIni >= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10' },
  ];

  const quickActions = [
    { name: 'Catat Pengeluaran', href: '/finance/cash-transactions', icon: ShoppingCart, color: 'from-blue-600 to-blue-500' },
    { name: 'Terima Stok Masuk', href: '/inventory', icon: Box, color: 'from-indigo-600 to-indigo-500' },
    { name: 'Buat Paket Usaha', href: '/products', icon: Package, color: 'from-rose-600 to-rose-500' },
    { name: 'Catat Penjualan', href: '/sales/orders', icon: Receipt, color: 'from-emerald-600 to-emerald-500' },
    { name: 'Terima Pembayaran', href: '/finance/ar/payments', icon: DollarSign, color: 'from-sbs-gold-600 to-sbs-gold-500' },
    { name: 'Panduan Alur', href: '/guide', icon: BarChart3, color: 'from-amber-600 to-amber-500' },
  ];

  if (loading) return <div className="p-8 text-center text-slate-500">Memuat Ringkasan Usaha...</div>;

  return (
    <div className="space-y-8">
      <div className="pb-5 border-b border-slate-200/60 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">Dashboard Utama</h3>
          <p className="mt-2 text-sm text-slate-500">Ringkasan cepat usaha dan jalan pintas aktivitas operasional hari ini.</p>
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((item) => (
          <div
            key={item.name}
            className="glass-card premium-hover p-6 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-gradient-to-br from-white to-transparent opacity-20 blur-2xl pointer-events-none"></div>
            <dt>
              <div className={`absolute rounded-xl p-3 ${item.bg} group-hover:scale-110 transition-transform duration-300`}>
                <item.icon className={`h-6 w-6 ${item.color}`} aria-hidden="true" />
              </div>
              <p className="ml-16 truncate text-sm font-medium text-slate-500">{item.name}</p>
            </dt>
            <dd className="ml-16 flex items-baseline pb-1 sm:pb-2">
              <p className="text-2xl font-bold text-slate-900">{item.stat}</p>
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-8">
        <h3 className="text-lg font-bold leading-6 text-slate-900 mb-6">Aksi Cepat</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {quickActions.map((action) => (
            <Link
              key={action.name}
              to={action.href}
              className={`relative group flex flex-col items-center p-6 rounded-2xl bg-gradient-to-br ${action.color} text-white premium-hover overflow-hidden`}
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <action.icon className="h-8 w-8 mb-3 transform group-hover:-translate-y-1 transition-transform" aria-hidden="true" />
              <span className="text-xs sm:text-sm font-bold text-center leading-tight">
                {action.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
