import { useState, useEffect } from 'react';
import type { ProfitDistribution, ProfitDistributionPayout } from '../types';
import { profitDistributionService } from '../services/profitDistributionService';
import { Building, Users, Coins, HeartHandshake } from 'lucide-react';

export default function ProfitDistributions() {
  const [distributions, setDistributions] = useState<ProfitDistribution[]>([]);
  const [selectedDist, setSelectedDist] = useState<ProfitDistribution | null>(null);
  const [payouts, setPayouts] = useState<ProfitDistributionPayout[]>([]);

  const loadData = () => {
    setDistributions(profitDistributionService.getDistributions());
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectDist = (d: ProfitDistribution) => {
    setSelectedDist(d);
    setPayouts(profitDistributionService.getPayouts(d.id));
  };

  const generateDraft = () => {
    const projectId = prompt("Enter Project ID to generate draft:");
    if (!projectId) return;
    try {
      profitDistributionService.generateDraftDistribution(projectId, 'finance_user');
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const approveDist = () => {
    if (!selectedDist) return;
    try {
      profitDistributionService.approveDistribution(selectedDist.id, 'ceo_user');
      loadData();
      selectDist(profitDistributionService.getDistributions().find(d => d.id === selectedDist.id)!);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const postDist = () => {
    if (!selectedDist) return;
    try {
      profitDistributionService.postDistribution(selectedDist.id, 'ceo_user');
      loadData();
      selectDist(profitDistributionService.getDistributions().find(d => d.id === selectedDist.id)!);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const makePayout = (type: any) => {
    if (!selectedDist) return;
    const amountStr = prompt(`Enter amount to payout for ${type}:`);
    if (!amountStr) return;
    const amount = parseFloat(amountStr);
    
    // Simplification for MVP: We assume payable_account_id is known or mocked
    try {
      const p = profitDistributionService.createPayout({
        profit_distribution_id: selectedDist.id,
        recipient_type: type,
        payable_account_id: 'MOCK-PAYABLE-ACC',
        cash_bank_account_id: 'MOCK-CASH-ACC',
        payment_date: new Date().toISOString().split('T')[0],
        amount: amount,
        notes: `Payout for ${type}`
      }, 'finance_user');
      
      // Auto-post for MVP simulation
      profitDistributionService.postPayout(p.id, 'finance_user');
      
      loadData();
      selectDist(profitDistributionService.getDistributions().find(d => d.id === selectedDist.id)!);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Profit Distributions</h1>
          <p className="text-slate-500">Manage profit splits, journal postings, and payouts.</p>
        </div>
        <button
          onClick={generateDraft}
          className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-md hover:bg-brand-700"
        >
          Generate Draft
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[800px]">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h2 className="font-bold text-slate-800">Distributions</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {distributions.map(d => (
              <button 
                key={d.id}
                onClick={() => selectDist(d)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedDist?.id === d.id ? 'bg-brand-50 border-brand-200' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
              >
                <div className="font-semibold text-slate-900 text-sm">Project: {d.project_id}</div>
                <div className="text-xs text-slate-500 mt-1">Profit: Rp {d.net_profit.toLocaleString()}</div>
                <div className="text-xs font-medium mt-1">{d.status}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {selectedDist ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Distribution Details</h2>
                  <span className="inline-flex mt-2 items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                    {selectedDist.status}
                  </span>
                </div>
                <div className="flex gap-2">
                  {selectedDist.status === 'Draft' && (
                    <button onClick={approveDist} className="px-3 py-1.5 bg-blue-100 text-blue-700 text-sm font-medium rounded-md">Approve</button>
                  )}
                  {selectedDist.status === 'Approved' && (
                    <button onClick={postDist} className="px-3 py-1.5 bg-brand-600 text-white text-sm font-medium rounded-md">Post Journal</button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2 mb-1"><Building className="w-4 h-4 text-slate-500"/><h3 className="text-xs font-semibold text-slate-500 uppercase">Reserve (10%)</h3></div>
                  <p className="text-lg font-bold text-slate-900 mt-1">Rp {selectedDist.company_reserve.toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2 mb-1"><Users className="w-4 h-4 text-slate-500"/><h3 className="text-xs font-semibold text-slate-500 uppercase">Workers (45%)</h3></div>
                  <p className="text-lg font-bold text-slate-900 mt-1">Rp {selectedDist.worker_pool.toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2 mb-1"><Coins className="w-4 h-4 text-slate-500"/><h3 className="text-xs font-semibold text-slate-500 uppercase">Investors (45%)</h3></div>
                  <p className="text-lg font-bold text-slate-900 mt-1">Rp {selectedDist.investor_pool.toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2 mb-1"><HeartHandshake className="w-4 h-4 text-slate-500"/><h3 className="text-xs font-semibold text-slate-500 uppercase">CSR (10%)</h3></div>
                  <p className="text-lg font-bold text-slate-900 mt-1">Rp {selectedDist.csr.toLocaleString()}</p>
                </div>
              </div>

              {selectedDist.status === 'Posted' || selectedDist.status === 'Partially Paid' || selectedDist.status === 'Paid' ? (
                <div className="space-y-4 pt-6 border-t border-slate-100">
                  <h3 className="text-lg font-bold text-slate-900">Payout Actions</h3>
                  <div className="flex flex-wrap gap-3">
                    <button onClick={() => makePayout('Company Reserve')} className="px-4 py-2 border border-slate-300 rounded-md hover:bg-slate-50 text-sm font-medium">Payout Reserve</button>
                    <button onClick={() => makePayout('Worker')} className="px-4 py-2 border border-slate-300 rounded-md hover:bg-slate-50 text-sm font-medium">Payout Workers</button>
                    <button onClick={() => makePayout('Investor')} className="px-4 py-2 border border-slate-300 rounded-md hover:bg-slate-50 text-sm font-medium">Payout Investors</button>
                    <button onClick={() => makePayout('CSR')} className="px-4 py-2 border border-slate-300 rounded-md hover:bg-slate-50 text-sm font-medium">Payout CSR</button>
                  </div>
                  
                  <h3 className="text-lg font-bold text-slate-900 mt-8 mb-4">Payout History</h3>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-sm text-slate-600">
                      <thead className="bg-slate-50 text-slate-900">
                        <tr>
                          <th className="px-4 py-2">Number</th>
                          <th className="px-4 py-2">Recipient Type</th>
                          <th className="px-4 py-2">Amount</th>
                          <th className="px-4 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {payouts.map(p => (
                          <tr key={p.id}>
                            <td className="px-4 py-2">{p.payout_number}</td>
                            <td className="px-4 py-2">{p.recipient_type}</td>
                            <td className="px-4 py-2 font-medium">Rp {p.amount.toLocaleString()}</td>
                            <td className="px-4 py-2">{p.status}</td>
                          </tr>
                        ))}
                        {payouts.length === 0 && (
                          <tr><td colSpan={4} className="px-4 py-4 text-center">No payouts yet.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

            </div>
          ) : (
            <div className="h-full flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-400">
              Select a distribution to view details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
