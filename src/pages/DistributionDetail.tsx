import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, PlayCircle, CheckCircle, AlertCircle, FileText, Plus } from 'lucide-react';
import { useShipments } from '../hooks/useShipments';
import { useDistributionCosts } from '../hooks/useDistributionCosts';
import { useCashBankAccounts } from '../hooks/useFinance';
import { supabase } from '../lib/supabase';
import Badge from '../components/Badge';
import Modal from '../components/Modal';

export default function DistributionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: shipments, loading, updateShipmentStatus } = useShipments();
  const shipment = shipments.find(s => s.id === id);
  
  const { data: costs, loading: costsLoading, addCost } = useDistributionCosts(id);
  const { data: cashBankAccounts } = useCashBankAccounts();

  const [isProcessing, setIsProcessing] = useState(false);
  const [isCostModalOpen, setIsCostModalOpen] = useState(false);
  
  // Cost Form State
  const [costDate, setCostDate] = useState(new Date().toISOString().split('T')[0]);
  const [costType, setCostType] = useState('BBM');
  const [amount, setAmount] = useState<number | ''>('');
  const [cashBankId, setCashBankId] = useState('');
  const [costNotes, setCostNotes] = useState('');

  const handleUpdateStatus = async (newStatus: string) => {
    setIsProcessing(true);
    try {
      let additionalData = {};
      if (newStatus === 'Diterima') {
        const recipient = prompt('Nama penerima barang:');
        if (!recipient) throw new Error('Harap masukkan nama penerima');
        additionalData = { recipient_name: recipient };
      } else if (newStatus === 'Gagal/Kendala') {
        const reason = prompt('Alasan gagal/kendala:');
        if (!reason) throw new Error('Harap masukkan alasan gagal');
        additionalData = { failure_reason: reason };
      }

      await updateShipmentStatus(id!, newStatus, additionalData);

      if (newStatus === 'Diterima') {
        // Also try to complete the sales order if it's Lunas
        const { data: so } = await supabase.from('sales_orders').select('payment_status').eq('id', shipment.so_id).single();
        if (so && so.payment_status === 'Lunas') {
          await supabase.from('sales_orders').update({ status: 'Selesai' }).eq('id', shipment.so_id);
        } else {
           await supabase.from('sales_orders').update({ status: 'Selesai Operasional' }).eq('id', shipment.so_id);
        }
      }

      alert(`Status berhasil diubah menjadi ${newStatus}`);
    } catch(e:any) {
      if (e.message) alert(e.message);
    }
    setIsProcessing(false);
  };

  const handleAddCost = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      if (!cashBankId) throw new Error('Silakan pilih akun Kas/Bank asal dana');
      
      await addCost({
        project_id: shipment.project_id,
        shipment_id: shipment.id,
        cost_date: costDate,
        cost_type: costType,
        amount: Number(amount),
        cash_bank_id: cashBankId,
        notes: costNotes
      });
      setIsCostModalOpen(false);
      setAmount('');
      setCostNotes('');
    } catch(e:any) {
      alert(e.message);
    }
    setIsProcessing(false);
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Memuat pengiriman...</div>;
  if (!shipment) return <div className="p-8 text-center text-red-500">Pengiriman tidak ditemukan</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/distribution/shipments')} className="p-2 hover:bg-slate-100 rounded-full">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{shipment.do_number}</h2>
            <p className="text-sm text-slate-500">Detail Pengiriman / Surat Jalan</p>
          </div>
        </div>
        <button onClick={() => window.open(`/distribution/shipments/${shipment.id}/waybill`, '_blank')} className="bg-slate-800 text-white px-4 py-2 rounded-md font-medium flex items-center gap-2 hover:bg-slate-900">
          <FileText className="w-4 h-4" /> Cetak Surat Jalan
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Informasi Pengiriman</h3>
            <div className="grid grid-cols-2 gap-y-4">
              <div>
                <p className="text-sm text-slate-500">Nomor Order (SO)</p>
                <p className="font-medium text-brand-600">{shipment.sales_order?.so_number}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Customer</p>
                <p className="font-medium text-slate-900">{shipment.sales_order?.customer?.name}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Tanggal Kirim</p>
                <p className="font-medium text-slate-900">{shipment.delivery_date}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Petugas / Driver</p>
                <p className="font-medium text-slate-900">{shipment.driver_name} ({shipment.vehicle_number || '-'})</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-slate-500">Alamat Pengiriman</p>
                <p className="font-medium text-slate-900 whitespace-pre-line">{shipment.delivery_address}</p>
              </div>
              {shipment.recipient_name && (
                <div>
                  <p className="text-sm text-slate-500">Penerima Barang</p>
                  <p className="font-medium text-slate-900">{shipment.recipient_name}</p>
                </div>
              )}
              {shipment.failure_reason && (
                <div className="col-span-2 bg-red-50 p-3 rounded border border-red-200">
                  <p className="text-sm text-red-700 font-medium">Alasan Gagal / Kendala:</p>
                  <p className="text-sm text-red-600">{shipment.failure_reason}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-800">Biaya Distribusi</h3>
              <button onClick={() => setIsCostModalOpen(true)} className="text-brand-600 text-sm font-medium hover:underline flex items-center gap-1">
                <Plus className="w-4 h-4" /> Tambah Biaya
              </button>
            </div>
            
            {costsLoading ? (
              <p className="text-sm text-slate-500">Memuat data biaya...</p>
            ) : costs.length === 0 ? (
              <p className="text-sm text-slate-500 italic">Belum ada catatan biaya distribusi untuk pengiriman ini.</p>
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
              <Badge variant={shipment.status === 'Dalam Pengiriman' ? 'warning' : shipment.status === 'Diterima' ? 'success' : shipment.status === 'Gagal/Kendala' ? 'danger' : 'default'} className="text-sm px-3 py-1">
                Status: {shipment.status}
              </Badge>
            </div>

            <div className="space-y-3">
              {shipment.status === 'Dijadwalkan' && (
                <button disabled={isProcessing} onClick={() => handleUpdateStatus('Dalam Pengiriman')} className="w-full bg-brand-600 text-white px-4 py-2 rounded-md font-medium flex items-center justify-center gap-2 hover:bg-brand-700 disabled:opacity-50">
                  <PlayCircle className="w-4 h-4" /> Mulai Pengiriman
                </button>
              )}
              
              {(shipment.status === 'Dalam Pengiriman' || shipment.status === 'Dijadwalkan') && (
                <>
                  <button disabled={isProcessing} onClick={() => handleUpdateStatus('Diterima')} className="w-full bg-green-600 text-white px-4 py-2 rounded-md font-medium flex items-center justify-center gap-2 hover:bg-green-700 disabled:opacity-50">
                    <CheckCircle className="w-4 h-4" /> Tandai Diterima
                  </button>
                  <button disabled={isProcessing} onClick={() => handleUpdateStatus('Gagal/Kendala')} className="w-full bg-red-600 text-white px-4 py-2 rounded-md font-medium flex items-center justify-center gap-2 hover:bg-red-700 disabled:opacity-50">
                    <AlertCircle className="w-4 h-4" /> Tandai Gagal / Kendala
                  </button>
                </>
              )}

              {shipment.status === 'Diterima' && (
                <div className="p-3 bg-green-50 border border-green-200 rounded text-green-800 text-sm font-medium text-center">
                  Pengiriman Selesai
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Modal isOpen={isCostModalOpen} onClose={() => setIsCostModalOpen(false)} title="Tambah Biaya Distribusi">
        <form onSubmit={handleAddCost} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Tanggal</label>
              <input type="date" required value={costDate} onChange={e => setCostDate(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Jenis Biaya</label>
              <select required value={costType} onChange={e => setCostType(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2">
                <option value="BBM">BBM / Bensin</option>
                <option value="Tol/Parkir">Tol / Parkir</option>
                <option value="Upah Kirim">Upah Kirim</option>
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
