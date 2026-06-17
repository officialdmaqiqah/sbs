import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  CheckCircle2, 
  Circle, 
  ArrowRight,
  PackageCheck,
  Users,
  Wallet,
  Rocket
} from 'lucide-react';

export default function GoLiveChecklist() {
  const { profile } = useAuth();
  const [checklist, setChecklist] = useState({
    masterBarang: false,
    stokAwal: false,
    kontak: false,
    saldoAwal: false,
    projectAktif: false,
    pengaturan: true
  });

  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (profile?.organization_id) {
      loadChecklistData();
    }
  }, [profile]);

  const loadChecklistData = async () => {
    try {
      const orgId = profile!.organization_id;

      const [{ count: itemsCount }, { count: inventoryCount }, { count: contactsCount }, { count: cashCount }, { count: projectCount }] = await Promise.all([
        supabase.from('items').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
        supabase.from('inventory_movements').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
        supabase.from('customers').select('*', { count: 'exact', head: true }).eq('organization_id', orgId), // assuming customers or suppliers exist
        supabase.from('cash_bank_accounts').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
        supabase.from('projects').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'Aktif')
      ]);

      const newChecklist = {
        masterBarang: (itemsCount || 0) > 0,
        stokAwal: (inventoryCount || 0) > 0,
        kontak: (contactsCount || 0) > 0,
        saldoAwal: (cashCount || 0) > 0,
        projectAktif: (projectCount || 0) > 0,
        pengaturan: true
      };

      setChecklist(newChecklist);

      const completed = Object.values(newChecklist).filter(Boolean).length;
      const total = Object.values(newChecklist).length;
      setProgress(Math.round((completed / total) * 100));

    } catch (e) {
      console.error("Failed to load checklist", e);
    }
  };

  const steps = [
    {
      id: 'projectAktif',
      title: 'Buat Project Aktif',
      description: 'Daftarkan minimal satu project yang sedang berjalan (misal: "Ayam Pedaging").',
      icon: Rocket,
      isDone: checklist.projectAktif,
      actionText: 'Ke Project',
      link: '/projects'
    },
    {
      id: 'masterBarang',
      title: 'Daftarkan Master Barang',
      description: 'Masukkan data bahan baku, pakan, atau peralatan yang Anda miliki.',
      icon: PackageCheck,
      isDone: checklist.masterBarang,
      actionText: 'Kelola Barang',
      link: '/inventory'
    },
    {
      id: 'stokAwal',
      title: 'Input Stok Awal',
      description: 'Masukkan jumlah fisik barang Anda ke dalam sistem sebagai saldo awal persediaan.',
      icon: CheckCircle2,
      isDone: checklist.stokAwal,
      actionText: 'Input Stok',
      link: '/inventory/opname'
    },
    {
      id: 'kontak',
      title: 'Data Pelanggan / Supplier',
      description: 'Catat pelanggan atau pemasok untuk kelancaran transaksi.',
      icon: Users,
      isDone: checklist.kontak,
      actionText: 'Ke Customer',
      link: '/sales/customers'
    },
    {
      id: 'saldoAwal',
      title: 'Buat Rekening Kas / Bank',
      description: 'Siapkan wadah penampung uang untuk mencatat pendapatan dan pengeluaran.',
      icon: Wallet,
      isDone: checklist.saldoAwal,
      actionText: 'Kelola Kas',
      link: '/finance/cash-bank'
    },
    {
      id: 'userRole',
      title: 'Atur Tim',
      description: 'Tambahkan anggota tim dan atur peran mereka (Admin, Finance, dll).',
      icon: Users,
      isDone: true, // mock
      actionText: 'Pengaturan User',
      link: '/settings/users'
    }
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="pb-5 border-b border-slate-200">
        <h3 className="text-2xl font-bold leading-6 text-slate-900 flex items-center gap-2">
          <Rocket className="w-6 h-6 text-brand-600" /> Go-Live Checklist
        </h3>
        <p className="mt-2 text-sm text-slate-500">Selesaikan langkah berikut agar sistem SBS siap 100%.</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-slate-700">Progress Setup Sistem</span>
          <span className="text-sm font-bold text-brand-600">{progress}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2.5">
          <div className="bg-brand-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
        </div>
        {progress === 100 && (
          <div className="mt-4 p-3 bg-emerald-50 text-emerald-800 text-sm rounded-lg font-medium border border-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" /> Mantap! Sistem SBS sudah siap digunakan sepenuhnya.
          </div>
        )}
      </div>

      <div className="space-y-4">
        {steps.map((step, index) => (
          <div key={step.id} className={`p-5 rounded-xl border transition-all ${step.isDone ? 'bg-slate-50 border-slate-200' : 'bg-white border-brand-200 shadow-sm'}`}>
            <div className="flex items-start gap-4">
              <div className="mt-1">
                {step.isDone ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                ) : (
                  <Circle className="w-6 h-6 text-slate-300" />
                )}
              </div>
              <div className="flex-1">
                <h4 className={`text-lg font-bold flex items-center gap-2 ${step.isDone ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                  {index + 1}. {step.title}
                </h4>
                <p className={`mt-1 text-sm ${step.isDone ? 'text-slate-400' : 'text-slate-600'}`}>{step.description}</p>
                
                {!step.isDone && (
                  <div className="mt-4">
                    <Link to={step.link} className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition-colors">
                      {step.actionText} <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                )}
              </div>
              <div className={`p-3 rounded-full hidden sm:block ${step.isDone ? 'bg-slate-100 text-slate-400' : 'bg-brand-50 text-brand-600'}`}>
                <step.icon className="w-6 h-6" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
