import { useState } from 'react';
import { db } from '../services/db';
import { AlertTriangle, CheckCircle2, Rocket, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CurrencyInput } from '../components/ui/CurrencyInput';

export default function InitialSetup() {
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSeedMasterData = () => {
    try {
      // 1. Kas/Bank
      const cashAccounts = [
        { id: crypto.randomUUID(), name: 'Kas Tunai', type: 'CASH', currency: 'IDR', status: 'ACTIVE' },
        { id: crypto.randomUUID(), name: 'Bank Utama', type: 'BANK', currency: 'IDR', status: 'ACTIVE' }
      ];
      cashAccounts.forEach(c => (db as any).insert('cash_bank_accounts', c));

      // 2. Suppliers
      const suppliers = [
        { id: crypto.randomUUID(), name: 'Supplier Pakan', type: 'VENDOR', status: 'ACTIVE' },
        { id: crypto.randomUUID(), name: 'Supplier Bahan Kandang', type: 'VENDOR', status: 'ACTIVE' },
        { id: crypto.randomUUID(), name: 'Supplier Obat/Vitamin', type: 'VENDOR', status: 'ACTIVE' },
        { id: crypto.randomUUID(), name: 'Supplier Ayam/DOC', type: 'VENDOR', status: 'ACTIVE' }
      ];
      suppliers.forEach(s => (db as any).insert('suppliers', s)); // Mock storing suppliers

      // 3. Customers
      const customers = [
        { id: crypto.randomUUID(), name: 'Customer Umum', type: 'REGULAR', status: 'ACTIVE' },
        { id: crypto.randomUUID(), name: 'Customer Telur', type: 'REGULAR', status: 'ACTIVE' },
        { id: crypto.randomUUID(), name: 'Customer Paket Kandang', type: 'REGULAR', status: 'ACTIVE' }
      ];
      customers.forEach(c => (db as any).insert('customers', c)); // Mock storing customers

      // 4. Barang
      const items = [
        { id: crypto.randomUUID(), code: 'BRG-01', name: 'Telur', category: 'Produk', type: 'FINISHED_GOODS', uom: 'Kg', cost: 0, price: 25000 },
        { id: crypto.randomUUID(), code: 'BRG-02', name: 'Ayam Petelur', category: 'Ayam', type: 'RAW_MATERIALS', uom: 'Ekor', cost: 70000, price: 80000 },
        { id: crypto.randomUUID(), code: 'BRG-03', name: 'Pakan', category: 'Pakan', type: 'RAW_MATERIALS', uom: 'Karung', cost: 350000, price: 380000 },
        { id: crypto.randomUUID(), code: 'BRG-04', name: 'Obat/Vitamin', category: 'Obat', type: 'RAW_MATERIALS', uom: 'Botol', cost: 50000, price: 60000 },
        { id: crypto.randomUUID(), code: 'BRG-05', name: 'Kawat', category: 'Bahan Kandang', type: 'RAW_MATERIALS', uom: 'Roll', cost: 150000, price: 0 },
        { id: crypto.randomUUID(), code: 'BRG-06', name: 'Kayu/Bambu', category: 'Bahan Kandang', type: 'RAW_MATERIALS', uom: 'Batang', cost: 15000, price: 0 },
        { id: crypto.randomUUID(), code: 'BRG-07', name: 'Paku/Baut', category: 'Bahan Kandang', type: 'RAW_MATERIALS', uom: 'Kg', cost: 20000, price: 0 },
        { id: crypto.randomUUID(), code: 'BRG-08', name: 'Atap', category: 'Bahan Kandang', type: 'RAW_MATERIALS', uom: 'Lembar', cost: 55000, price: 0 },
        { id: crypto.randomUUID(), code: 'BRG-09', name: 'Tempat Pakan', category: 'Peralatan', type: 'RAW_MATERIALS', uom: 'Pcs', cost: 30000, price: 0 },
        { id: crypto.randomUUID(), code: 'BRG-10', name: 'Tempat Minum', category: 'Peralatan', type: 'RAW_MATERIALS', uom: 'Pcs', cost: 25000, price: 0 }
      ];
      items.forEach(i => (db as any).insert('items', i));

      setSuccess('Master Data awal (Barang, Supplier, Customer, Kas) berhasil di-generate!');
    } catch (err: any) {
      setError(err.message || 'Gagal generate data');
    }
  };

  const handleInputSaldo = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const nominal = parseFloat(fd.get('nominal') as string) || 0;
    
    try {
      // Create an initial journal entry for saldo awal kas
      const journalId = crypto.randomUUID();
      (db as any).insert('journal_entries', {
        id: journalId,
        date: new Date().toISOString(),
        description: 'Saldo Awal Kas',
        status: 'POSTED'
      });
      (db as any).insert('journal_entry_lines', {
        id: crypto.randomUUID(),
        journal_entry_id: journalId,
        account_id: 'cash-account-1',
        debit: nominal,
        credit: 0
      });
      
      setSuccess('Saldo Awal berhasil dicatat! (Simulasi)');
    } catch (err: any) {
      setError('Gagal mencatat saldo');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="pb-5 border-b border-slate-200">
        <h3 className="text-2xl font-bold leading-6 text-slate-900 flex items-center gap-2">
          <Rocket className="w-6 h-6 text-brand-600" /> Initial Balance & Setup (Go-Live)
        </h3>
        <p className="mt-2 text-sm text-slate-500">
          Gunakan halaman ini untuk mempersiapkan data awal UMKM (Master Barang, Saldo Awal, dll).
        </p>
      </div>

      {success && (
        <div className="p-4 bg-emerald-50 text-emerald-800 rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" /> {success}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 text-red-800 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Step 1: Starter Data */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h4 className="text-lg font-bold mb-2">1. Generate Master Data</h4>
          <p className="text-sm text-slate-600 mb-6">
            Buat data dummy awal seperti Pakan, Obat, Kawat, Supplier, dan Pelanggan agar tidak perlu input satu per satu.
          </p>
          <button 
            onClick={handleSeedMasterData}
            className="w-full bg-brand-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-700 transition"
          >
            Generate Starter Data
          </button>
        </div>

        {/* Step 2: Saldo Awal Kas */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h4 className="text-lg font-bold mb-2">2. Input Saldo Awal Kas</h4>
          <p className="text-sm text-slate-600 mb-6">
            Masukkan total uang tunai dan saldo bank Anda saat ini.
          </p>
          <form onSubmit={handleInputSaldo} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Total Kas & Bank (Rp)</label>
              <CurrencyInput  name="nominal" className="w-full border-slate-300 rounded-lg" placeholder="Contoh: 15000000" required />
            </div>
            <button type="submit" className="w-full bg-slate-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-slate-800 transition">
              Simpan Saldo Awal
            </button>
          </form>
        </div>

        {/* Step 3: Stok Awal */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h4 className="text-lg font-bold mb-2">3. Input Stok Awal</h4>
          <p className="text-sm text-slate-600 mb-6">
            Lakukan Stock Opname awal untuk memasukkan kuantitas barang yang ada di gudang.
          </p>
          <Link to="/inventory" className="inline-flex items-center justify-center w-full bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-50 transition">
            Pergi ke Menu Stok <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>

        {/* Step 4: Hutang / Piutang Awal */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h4 className="text-lg font-bold mb-2">4. Hutang & Piutang Awal</h4>
          <p className="text-sm text-slate-600 mb-6">
            Catat sisa hutang ke supplier dan piutang dari pelanggan yang belum lunas.
          </p>
          <div className="flex gap-2">
            <Link to="/finance/ap/bills" className="flex-1 text-center bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-50 transition text-sm">
              Hutang Awal
            </Link>
            <Link to="/finance/ar/invoices" className="flex-1 text-center bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-50 transition text-sm">
              Piutang Awal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
