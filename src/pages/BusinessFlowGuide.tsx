import { Link } from 'react-router-dom';
import {
  FolderPlus,
  Users,
  PackagePlus,
  Wrench,
  Layers,
  ShoppingCart,
  Truck,
  Banknote,
  PieChart,
  FileCheck,
  Package
} from 'lucide-react';

export default function BusinessFlowGuide() {
  const steps = [
    {
      title: '1. Buat Project',
      desc: 'Mulai dengan mendaftarkan Project baru (Misal: "Ayam Pedaging Batch 1").',
      icon: FolderPlus,
      link: '/projects',
      color: 'text-brand-600 bg-brand-50 border-brand-200'
    },
    {
      title: '2. Input Team & Modal',
      desc: 'Masukkan anggota tim yang bekerja dan investor pendana project tersebut.',
      icon: Users,
      link: '/projects/investors',
      color: 'text-indigo-600 bg-indigo-50 border-indigo-200'
    },
    {
      title: '3. Catat Stok / Pembelian',
      desc: 'Catat pembelian awal atau terima barang masuk ke gudang SBS.',
      icon: PackagePlus,
      link: '/purchase',
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200'
    },
    {
      title: '4. Produksi & Racik Pakan',
      desc: 'Gunakan bahan baku untuk membuat Kandang atau Meracik Pakan Jadi.',
      icon: Wrench,
      link: '/operations/cage-production',
      color: 'text-amber-600 bg-amber-50 border-amber-200'
    },
    {
      title: '5. Buat Produk & Paket',
      desc: 'Atur barang/hasil panen menjadi Produk Retail atau Paket Usaha siap jual.',
      icon: Layers,
      link: '/products',
      color: 'text-rose-600 bg-rose-50 border-rose-200'
    },
    {
      title: '6. Order Penjualan',
      desc: 'Catat pesanan dari customer, pilih project dan paket yang dibeli.',
      icon: ShoppingCart,
      link: '/sales/orders',
      color: 'text-blue-600 bg-blue-50 border-blue-200'
    },
    {
      title: '7. Proses Barang Keluar',
      desc: 'Ubah status penjualan menjadi "Proses" agar stok fisik berkurang.',
      icon: Package,
      link: '/sales/orders',
      color: 'text-purple-600 bg-purple-50 border-purple-200'
    },
    {
      title: '8. Distribusi',
      desc: 'Jadwalkan pengiriman untuk order yang sudah diproses, catat biaya kirim.',
      icon: Truck,
      link: '/distribution/shipments',
      color: 'text-orange-600 bg-orange-50 border-orange-200'
    },
    {
      title: '9. Catat Pembayaran',
      desc: 'Terima pembayaran piutang dari customer atau pelunasan hutang supplier.',
      icon: Banknote,
      link: '/finance/cash-bank',
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200'
    },
    {
      title: '10. Cek Laporan',
      desc: 'Pantau arus kas, laba rugi, dan neraca project secara real-time.',
      icon: PieChart,
      link: '/reports/pl',
      color: 'text-sky-600 bg-sky-50 border-sky-200'
    },
    {
      title: '11. Tutup Buku',
      desc: 'Jika project selesai, lakukan Tutup Buku untuk menghitung bagi hasil otomatis.',
      icon: FileCheck,
      link: '/finance/project-closing',
      color: 'text-sbs-gold-600 bg-sbs-gold-50 border-sbs-gold-200'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="text-center pb-8 border-b border-slate-200">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Panduan Alur Kerja SBS</h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-slate-600">
          Ikuti langkah-langkah di bawah ini secara berurutan untuk menjalankan proses bisnis dari hulu ke hilir dengan sistem SBS.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative">
        {steps.map((step, idx) => (
          <Link key={idx} to={step.link} className={`relative block group p-6 bg-white rounded-2xl border shadow-sm hover:shadow-lg transition-all transform hover:-translate-y-1 ${step.color.split(' ')[2]}`}>
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 ${step.color.split(' ').slice(0, 2).join(' ')}`}>
              <step.icon className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">{step.title}</h3>
            <p className="text-slate-600 text-sm leading-relaxed">{step.desc}</p>
            <div className="mt-4 inline-flex items-center text-sm font-semibold text-slate-900 group-hover:text-brand-600 transition-colors">
              Buka Halaman <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
