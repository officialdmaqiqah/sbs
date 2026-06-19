import toast from 'react-hot-toast';
 import { useState, useEffect } from 'react'; 
import { db } from '../services/db';
import { dailyRecordService } from '../services/dailyRecordService';
import type { Flock, DailyChickenRecord } from '../types';
import { Plus, Wheat, Bird, BarChart3 } from 'lucide-react';

export default function OperasionalAyam() {
  const [activeTab, setActiveTab] = useState<'DailyRecords' | 'Flocks' | 'Reports'>('DailyRecords');
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [records, setRecords] = useState<DailyChickenRecord[]>([]);


  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setFlocks((db as any).getAll('flocks'));
    setRecords((db as any).getAll('daily_chicken_records'));
  };

  const getPopulasiAktif = () => {
    return flocks.reduce((sum, f) => {
      // Find latest record for this flock
      const flockRecords = records.filter(r => r.flock_id === f.id && r.status === 'Posted').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      if (flockRecords.length > 0) return sum + flockRecords[0].end_population;
      return sum + f.initial_population;
    }, 0);
  };

  const renderDailyRecords = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-slate-900">Catatan Harian Ayam</h3>
        <button 
          onClick={() => toast.error('Fitur ini belum aktif di Internal Beta.')}
          className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-md hover:bg-brand-700"
        >
          <Plus className="w-4 h-4" /> Entry Harian Baru
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">No. Record</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tanggal</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Flock</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Populasi Akhir</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">HDP %</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Aksi</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {records.map((rec) => {
              const flock = flocks.find(f => f.id === rec.flock_id);
              return (
                <tr key={rec.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{rec.record_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{rec.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{flock?.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{rec.end_population}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{rec.hdp ? rec.hdp.toFixed(1) + '%' : '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${rec.status === 'Draft' ? 'bg-slate-100 text-slate-800' : 
                        rec.status === 'Submitted' ? 'bg-blue-100 text-blue-800' : 
                        rec.status === 'Approved' ? 'bg-amber-100 text-amber-800' : 
                        rec.status === 'Posted' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {rec.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-600 hover:text-brand-900 cursor-pointer">
                    <div className="flex gap-2">
                      <button onClick={() => {
                        if(confirm('Approve & Post Record?')) {
                          dailyRecordService.updateRecordStatus(rec.id, 'Submitted', 'Admin');
                          dailyRecordService.updateRecordStatus(rec.id, 'Approved', 'Admin');
                          const res = dailyRecordService.postDailyRecord(rec.id, 'Admin');
                          if(res.success) loadData(); else toast.error(res.message);
                        }
                      }}>Post</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderFlocks = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-slate-900">Unit Pemeliharaan Ayam (Flocks)</h3>
        <button 
          onClick={() => toast.error('Fitur ini belum aktif di Internal Beta.')}
          className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-md hover:bg-brand-700"
        >
          <Plus className="w-4 h-4" /> Tambah Flock
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {flocks.map(f => (
          <div key={f.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
            <h4 className="font-semibold text-lg">{f.name}</h4>
            <p className="text-sm text-slate-500 mb-2">{f.flock_code} • {f.chicken_type}</p>
            <div className="flex justify-between items-center mt-4">
              <div>
                <p className="text-xs text-slate-400">Populasi Awal</p>
                <p className="font-medium">{f.initial_population} Ekor</p>
              </div>
              <span className={`px-2 py-1 text-xs rounded-full ${f.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}`}>
                {f.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Operasional Ayam</h1>
          <p className="text-slate-500">Mencatat kematian ayam, pakan harian, dan produksi telur.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="bg-blue-100 p-3 rounded-lg"><Bird className="w-6 h-6 text-blue-600"/></div>
          <div>
            <p className="text-sm text-slate-500">Total Populasi Aktif</p>
            <p className="text-xl font-bold">{getPopulasiAktif()} Ekor</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="bg-amber-100 p-3 rounded-lg"><Wheat className="w-6 h-6 text-amber-600"/></div>
          <div>
            <p className="text-sm text-slate-500">Flocks Aktif</p>
            <p className="text-xl font-bold">{flocks.filter(f => f.status === 'Active').length}</p>
          </div>
        </div>
      </div>

      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button onClick={() => setActiveTab('DailyRecords')} className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${activeTab === 'DailyRecords' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'}`}>Daily Records</button>
          <button onClick={() => setActiveTab('Flocks')} className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${activeTab === 'Flocks' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'}`}>Flocks</button>
          <button onClick={() => setActiveTab('Reports')} className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${activeTab === 'Reports' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'}`}>Reports</button>
        </nav>
      </div>

      {activeTab === 'DailyRecords' && renderDailyRecords()}
      {activeTab === 'Flocks' && renderFlocks()}
      {activeTab === 'Reports' && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex flex-col items-center justify-center py-12">
          <BarChart3 className="w-12 h-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900">Laporan MVP</h3>
          <p className="text-slate-500">Laporan detil (Hen Day Production, FCR, Mortality) dapat ditarik dengan ekspor CSV (Coming Soon).</p>
        </div>
      )}
      
      {/* Simple Form Modals would go here (omitted for MVP brevity, logic tested in backend script) */}
      
    </div>
  );
}
