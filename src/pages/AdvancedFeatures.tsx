import { useNavigate } from 'react-router-dom';
import { Settings, Lock, FileSpreadsheet, Scale, BookOpen, Layers, GitMerge, DollarSign, Calendar, Truck, Activity, Briefcase } from 'lucide-react';

export default function AdvancedFeatures() {
  const navigate = useNavigate();

  const features = [
    {
      category: 'Operasi Bisnis Lanjutan',
      items: [
        { name: 'Project & RAB', desc: 'Manajemen proyek dan alokasi dana khusus.', status: 'Tersedia tapi disembunyikan', active: true, route: '/projects', icon: Briefcase },
        { name: 'Produksi Kandang', desc: 'Pengelolaan siklus produksi ayam dari DOC hingga panen.', status: 'Belum aktif di Internal Beta', active: false, route: '/produksi-kandang', icon: Activity },
        { name: 'Operasional Ayam', desc: 'Catatan operasional harian ayam dan manajemen flock.', status: 'Belum aktif di Internal Beta', active: false, route: '/operasional-ayam', icon: Activity },
        { name: 'Racik Pakan', desc: 'Pembuatan formula pakan dan manajemen inventori bahan.', status: 'Belum aktif di Internal Beta', active: false, route: '/racik-pakan', icon: GitMerge },
        { name: 'Distribusi', desc: 'Logistik pengiriman dan pengelolaan armada.', status: 'Tersedia tapi disembunyikan', active: true, route: '/distribusi', icon: Truck },
      ]
    },
    {
      category: 'Akuntansi Lanjutan',
      items: [
        { name: 'Dashboard Akuntansi', desc: 'Akses ke ikhtisar penuh akuntansi lanjutan.', status: 'Tersedia tapi disembunyikan', active: true, route: '/finance', icon: FileSpreadsheet },
        { name: 'Journal Register', desc: 'Catatan mendetail dari setiap jurnal akuntansi (debit/kredit).', status: 'Tersedia tapi disembunyikan', active: true, route: '/finance/journals', icon: BookOpen },
        { name: 'General Ledger', desc: 'Buku besar akuntansi untuk semua pergerakan akun.', status: 'Tersedia tapi disembunyikan', active: true, route: '/finance/gl', icon: BookOpen },
        { name: 'Trial Balance', desc: 'Neraca lajur untuk memverifikasi keseimbangan kredit dan debit.', status: 'Tersedia tapi disembunyikan', active: true, route: '/finance/tb', icon: Scale },
        { name: 'Chart of Accounts', desc: 'Daftar kode akun standar untuk pencatatan keuangan.', status: 'Tersedia tapi disembunyikan', active: true, route: '/finance/coa', icon: Layers },
        { name: 'Accounting Mapping', desc: 'Pemetaan kategori produk/transaksi ke kode akun yang tepat.', status: 'Tersedia tapi disembunyikan', active: true, route: '/finance/mapping', icon: GitMerge },
        { name: 'Period Closing', desc: 'Fitur tutup buku akhir bulan untuk mengunci periode keuangan.', status: 'Untuk fase lanjutan', active: false, route: '/finance/periods', icon: Calendar },
        { name: 'Profit Distribution', desc: 'Distribusi otomatis laba bersih ke pemegang saham (Investor).', status: 'Untuk fase lanjutan', active: false, route: '/finance/profit-distributions', icon: DollarSign },
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-brand-600" />
            Fitur Lanjutan
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Daftar fitur-fitur kompleks yang saat ini disembunyikan pada Mode Simple UMKM agar tidak mengganggu operasional harian.
          </p>
        </div>
      </div>

      <div className="space-y-8">
        {features.map((section, sidx) => (
          <div key={sidx}>
            <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b pb-2">{section.category}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {section.items.map((item, idx) => (
                <div key={idx} className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow relative overflow-hidden group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
                        <item.icon className="w-5 h-5" />
                      </div>
                      <h4 className="font-semibold text-slate-900">{item.name}</h4>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 mb-4 line-clamp-2 h-10">{item.desc}</p>
                  
                  <div className="flex items-center justify-between">
                    <span className={`text-xs px-2 py-1 rounded-md font-medium flex items-center gap-1
                      ${item.status.includes('Tersedia') ? 'bg-emerald-50 text-emerald-700' : 
                        item.status.includes('fase') ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
                      {!item.active && <Lock className="w-3 h-3" />}
                      {item.status}
                    </span>
                    
                    <button
                      disabled={!item.active}
                      onClick={() => item.active && navigate(item.route)}
                      className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors
                        ${item.active 
                          ? 'bg-brand-50 text-brand-700 hover:bg-brand-100 border border-brand-200' 
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                    >
                      {item.active ? 'Buka' : 'Nanti'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
