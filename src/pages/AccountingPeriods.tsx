import { useState, useEffect } from 'react';
import { AlertTriangle, ShieldCheck, Plus } from 'lucide-react';
import type { AccountingPeriod } from '../types';
import { periodService } from '../services/periodService';
import type { ChecklistResult } from '../services/periodService';

export default function AccountingPeriods() {
  const [periods, setPeriods] = useState<AccountingPeriod[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'soft-close' | 'hard-close' | 'reopen'>('create');
  const [selectedPeriod, setSelectedPeriod] = useState<AccountingPeriod | null>(null);
  const [checklist, setChecklist] = useState<ChecklistResult[]>([]);
  
  const [formData, setFormData] = useState({
    period_code: '',
    period_name: '',
    start_date: '',
    end_date: '',
    fiscal_year: new Date().getFullYear(),
    notes: '',
    override_reason: ''
  });

  const loadData = () => {
    setPeriods(periodService.getPeriods());
  };

  useEffect(() => {
    loadData();
  }, []);

  const openModal = (mode: typeof modalMode, period?: AccountingPeriod) => {
    setModalMode(mode);
    setSelectedPeriod(period || null);
    if (period && (mode === 'soft-close' || mode === 'hard-close')) {
      setChecklist(periodService.runPreCloseChecklist(period.id));
    }
    setFormData({
      period_code: period?.period_code || '',
      period_name: period?.period_name || '',
      start_date: period?.start_date || '',
      end_date: period?.end_date || '',
      fiscal_year: period?.fiscal_year || new Date().getFullYear(),
      notes: period?.notes || '',
      override_reason: ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (modalMode === 'create') {
        periodService.createPeriod({
          period_code: formData.period_code,
          period_name: formData.period_name,
          start_date: formData.start_date,
          end_date: formData.end_date,
          fiscal_year: formData.fiscal_year,
          status: 'Open',
          notes: formData.notes,
          created_by: 'finance_user'
        });
      } else if (modalMode === 'soft-close' && selectedPeriod) {
        periodService.softClosePeriod(selectedPeriod.id, 'ceo_user', formData.override_reason);
      } else if (modalMode === 'hard-close' && selectedPeriod) {
        periodService.hardClosePeriod(selectedPeriod.id, 'ceo_user', formData.override_reason);
      } else if (modalMode === 'reopen' && selectedPeriod) {
        periodService.reopenPeriod(selectedPeriod.id, 'ceo_user', formData.override_reason);
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const hasFails = checklist.some(c => c.status === 'Fail');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Accounting Periods</h1>
          <p className="text-slate-500">Manage financial periods, soft close, and hard close operations.</p>
        </div>
        <button
          onClick={() => openModal('create')}
          className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-md hover:bg-brand-700"
        >
          <Plus className="w-4 h-4" /> Create Period
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-900 uppercase font-medium">
              <tr>
                <th className="px-6 py-4">Period Code</th>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Dates</th>
                <th className="px-6 py-4">Fiscal Year</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {periods.map(p => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{p.period_code}</td>
                  <td className="px-6 py-4">{p.period_name}</td>
                  <td className="px-6 py-4">{p.start_date} to {p.end_date}</td>
                  <td className="px-6 py-4">{p.fiscal_year}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${p.status === 'Open' ? 'bg-emerald-100 text-emerald-800' : 
                        p.status === 'Soft Closed' ? 'bg-amber-100 text-amber-800' : 
                        'bg-slate-100 text-slate-800'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-3">
                    {p.status === 'Open' && (
                      <button onClick={() => openModal('soft-close', p)} className="text-amber-600 hover:text-amber-900 font-medium">Soft Close</button>
                    )}
                    {(p.status === 'Open' || p.status === 'Soft Closed') && (
                      <button onClick={() => openModal('hard-close', p)} className="text-brand-600 hover:text-brand-900 font-medium">Hard Close</button>
                    )}
                    {p.status === 'Closed' && (
                      <button onClick={() => openModal('reopen', p)} className="text-red-600 hover:text-red-900 font-medium">Reopen</button>
                    )}
                  </td>
                </tr>
              ))}
              {periods.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No accounting periods found. Create one to start recording transactions.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-3xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                {modalMode === 'create' ? 'Create Accounting Period' : 
                 modalMode === 'soft-close' ? `Soft Close Period: ${selectedPeriod?.period_code}` : 
                 modalMode === 'hard-close' ? `Hard Close Period: ${selectedPeriod?.period_code}` : 
                 `Reopen Period: ${selectedPeriod?.period_code}`}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {modalMode === 'create' ? (
                <form id="periodForm" onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">Period Code</label>
                      <input className="w-full rounded-md border border-slate-300 px-3 py-2" value={formData.period_code} onChange={e => setFormData({...formData, period_code: e.target.value})} required placeholder="e.g. 2026-06" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">Period Name</label>
                      <input className="w-full rounded-md border border-slate-300 px-3 py-2" value={formData.period_name} onChange={e => setFormData({...formData, period_name: e.target.value})} required placeholder="e.g. June 2026" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">Start Date</label>
                      <input type="date" className="w-full rounded-md border border-slate-300 px-3 py-2" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} required />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">End Date</label>
                      <input type="date" className="w-full rounded-md border border-slate-300 px-3 py-2" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} required />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">Fiscal Year</label>
                      <input type="number" className="w-full rounded-md border border-slate-300 px-3 py-2" value={formData.fiscal_year} onChange={e => setFormData({...formData, fiscal_year: parseInt(e.target.value)})} required />
                    </div>
                  </div>
                </form>
              ) : modalMode === 'reopen' ? (
                <form id="periodForm" onSubmit={handleSubmit} className="space-y-4">
                  <div className="bg-red-50 text-red-800 p-4 rounded-md flex gap-3">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <div>
                      <h4 className="font-bold">Warning: Reopening Period</h4>
                      <p className="text-sm mt-1">Reopening a period will invalidate its financial snapshots. Only do this to correct critical errors.</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Reopen Reason (Min 20 chars)</label>
                    <textarea className="w-full rounded-md border border-slate-300 px-3 py-2" rows={4} value={formData.override_reason} onChange={e => setFormData({...formData, override_reason: e.target.value})} required minLength={20} placeholder="Why are you reopening this period?"></textarea>
                  </div>
                </form>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Pre-Close Checklist</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {checklist.map(item => (
                        <div key={item.code} className={`p-3 rounded-lg border flex gap-3 ${item.status === 'Pass' ? 'bg-emerald-50 border-emerald-100' : item.status === 'Warning' ? 'bg-amber-50 border-amber-100' : 'bg-red-50 border-red-100'}`}>
                          <div className={`mt-0.5 ${item.status === 'Pass' ? 'text-emerald-500' : item.status === 'Warning' ? 'text-amber-500' : 'text-red-500'}`}>
                            {item.status === 'Pass' ? <ShieldCheck className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-slate-900">{item.label}</p>
                            <p className="text-xs text-slate-600 mt-1">{item.detail}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <form id="periodForm" onSubmit={handleSubmit} className="space-y-4 pt-4 border-t">
                    {hasFails && modalMode === 'hard-close' ? (
                      <div className="bg-red-50 text-red-800 p-4 rounded-md">
                        <strong>Hard Close Blocked:</strong> You cannot hard close this period because there are FAILED checklist items. Resolve them first.
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">Override Reason / Notes (Optional for Soft Close)</label>
                        <textarea className="w-full rounded-md border border-slate-300 px-3 py-2" rows={3} value={formData.override_reason} onChange={e => setFormData({...formData, override_reason: e.target.value})} placeholder={hasFails ? "Reason for override is required for warning items..." : "Optional notes"}></textarea>
                      </div>
                    )}
                  </form>
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 rounded-b-xl">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-md">Cancel</button>
              {!(hasFails && modalMode === 'hard-close') && (
                <button type="submit" form="periodForm" className="px-4 py-2 bg-brand-600 text-white font-medium rounded-md hover:bg-brand-700">
                  {modalMode === 'create' ? 'Create Period' : 'Confirm'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
