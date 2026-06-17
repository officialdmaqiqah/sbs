 import { useState, useEffect } from 'react'; 
import { db } from '../services/db';
import type { JournalEntry, Account, Project } from '../types';
import { AlertCircle, CheckCircle } from 'lucide-react';

export default function TrialBalance() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  
  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [projectId, setProjectId] = useState('');
  const [includeZero, setIncludeZero] = useState(false);

  const [tbData, setTbData] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const isSupabase = localStorage.getItem('VITE_DATA_PROVIDER') === 'supabase' || import.meta.env.VITE_DATA_PROVIDER === 'supabase';
    
    if (isSupabase) {
      const { supabase } = await import('../lib/supabase');
      const [resAcc, resProj] = await Promise.all([
        supabase.from('chart_of_accounts').select('*').eq('allow_posting', true).order('account_code'),
        supabase.from('projects').select('*')
      ]);
      if (resAcc.data) setAccounts(resAcc.data);
      if (resProj.data) setProjects(resProj.data);
    } else {
      const accs = (db as any).getAll('accounts').filter((a: any) => a.allow_posting).sort((a: any, b: any) => a.account_code.localeCompare(b.account_code));
      setAccounts(accs);
      setProjects((db as any).getAll('projects'));
    }
  };

  useEffect(() => {
    calculateTB();
  }, [dateFrom, dateTo, projectId, includeZero, accounts]);

  const calculateTB = async () => {
    if (accounts.length === 0) return;

    const isSupabase = localStorage.getItem('VITE_DATA_PROVIDER') === 'supabase' || import.meta.env.VITE_DATA_PROVIDER === 'supabase';
    
    let js: any[] = [];
    let ls: any[] = [];

    if (isSupabase) {
      const { supabase } = await import('../lib/supabase');
      const [resJ, resL] = await Promise.all([
        supabase.from('journal_entries').select('*').eq('status', 'Posted'),
        supabase.from('journal_entry_lines').select('*')
      ]);
      if (resJ.data) js = resJ.data;
      if (resL.data) ls = resL.data;
    } else {
      js = (db as any).getAll('journal_entries').filter((j: any) => j.status === 'Posted');
      ls = (db as any).getAll('journal_entry_lines');
    }

    const jMap: Record<string, JournalEntry> = {};
    js.forEach((j: any) => jMap[j.id] = j);

    const result = accounts.map(acc => {
      let opDebit = 0, opCredit = 0;
      let perDebit = 0, perCredit = 0;

      ls.filter((l: any) => l.account_id === acc.id).forEach((l: any) => {
        if (projectId && l.project_id !== projectId) return;
        const j = jMap[l.journal_entry_id!];
        if (!j) return;

        const d = j.journal_date;
        if (dateFrom && d < dateFrom) {
          opDebit += l.debit;
          opCredit += l.credit;
        } else if (!dateTo || d <= dateTo) {
          perDebit += l.debit;
          perCredit += l.credit;
        }
      });

      // Calculate net opening
      let netOpDebit = 0, netOpCredit = 0;
      if (opDebit > opCredit) netOpDebit = opDebit - opCredit;
      else netOpCredit = opCredit - opDebit;

      // Calculate net ending
      let endDebit = netOpDebit + perDebit;
      let endCredit = netOpCredit + perCredit;
      
      let netEndDebit = 0, netEndCredit = 0;
      if (endDebit > endCredit) netEndDebit = endDebit - endCredit;
      else netEndCredit = endCredit - endDebit;

      return {
        acc,
        opDebit: netOpDebit,
        opCredit: netOpCredit,
        perDebit,
        perCredit,
        endDebit: netEndDebit,
        endCredit: netEndCredit
      };
    });

    const filteredResult = includeZero ? result : result.filter(r => r.opDebit > 0 || r.opCredit > 0 || r.perDebit > 0 || r.perCredit > 0 || r.endDebit > 0 || r.endCredit > 0);
    setTbData(filteredResult);
  };

  const totals = tbData.reduce((acc, curr) => ({
    opDebit: acc.opDebit + curr.opDebit,
    opCredit: acc.opCredit + curr.opCredit,
    perDebit: acc.perDebit + curr.perDebit,
    perCredit: acc.perCredit + curr.perCredit,
    endDebit: acc.endDebit + curr.endDebit,
    endCredit: acc.endCredit + curr.endCredit,
  }), { opDebit: 0, opCredit: 0, perDebit: 0, perCredit: 0, endDebit: 0, endCredit: 0 });

  const isBalanced = Math.abs(totals.endDebit - totals.endCredit) <= 1;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Trial Balance</h1>
        {isBalanced ? (
          <div className="flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-full font-medium">
            <CheckCircle className="w-5 h-5 mr-2" /> Balanced
          </div>
        ) : (
          <div className="flex items-center px-4 py-2 bg-red-100 text-red-800 rounded-full font-medium">
            <AlertCircle className="w-5 h-5 mr-2" /> Unbalanced (Diff: Rp{Math.abs(totals.endDebit - totals.endCredit).toLocaleString()})
          </div>
        )}
      </div>

      <div className="flex gap-4 items-center">
        <input type="date" className="border p-2 rounded" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        <input type="date" className="border p-2 rounded" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        <select className="border p-2 rounded flex-1" value={projectId} onChange={e => setProjectId(e.target.value)}>
          <option value="">All Projects</option>
          {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name || p.project_name}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={includeZero} onChange={e => setIncludeZero(e.target.checked)} />
          Include Zero Balances
        </label>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 font-medium text-gray-600" rowSpan={2}>Account</th>
              <th className="p-4 font-medium text-gray-600 text-center border-l" colSpan={2}>Opening Balance</th>
              <th className="p-4 font-medium text-gray-600 text-center border-l" colSpan={2}>Period Mutation</th>
              <th className="p-4 font-medium text-gray-600 text-center border-l" colSpan={2}>Ending Balance</th>
            </tr>
            <tr className="border-b">
              <th className="p-2 font-medium text-gray-500 text-right border-l">Debit</th>
              <th className="p-2 font-medium text-gray-500 text-right">Credit</th>
              <th className="p-2 font-medium text-gray-500 text-right border-l">Debit</th>
              <th className="p-2 font-medium text-gray-500 text-right">Credit</th>
              <th className="p-2 font-medium text-gray-500 text-right border-l">Debit</th>
              <th className="p-2 font-medium text-gray-500 text-right">Credit</th>
            </tr>
          </thead>
          <tbody>
            {tbData.map((row, i) => (
              <tr key={i} className="border-b hover:bg-gray-50">
                <td className="p-4">
                  <a href={`/finance/gl?account=${row.acc.id}`} className="text-blue-600 hover:underline">
                    {row.acc.account_code} - {row.acc.account_name}
                  </a>
                </td>
                <td className="p-4 text-right border-l">{row.opDebit > 0 ? row.opDebit.toLocaleString() : '-'}</td>
                <td className="p-4 text-right">{row.opCredit > 0 ? row.opCredit.toLocaleString() : '-'}</td>
                <td className="p-4 text-right border-l">{row.perDebit > 0 ? row.perDebit.toLocaleString() : '-'}</td>
                <td className="p-4 text-right">{row.perCredit > 0 ? row.perCredit.toLocaleString() : '-'}</td>
                <td className="p-4 text-right border-l font-medium">{row.endDebit > 0 ? row.endDebit.toLocaleString() : '-'}</td>
                <td className="p-4 text-right font-medium">{row.endCredit > 0 ? row.endCredit.toLocaleString() : '-'}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold">
              <td className="p-4 text-right">TOTAL</td>
              <td className="p-4 text-right border-l text-green-700">{totals.opDebit.toLocaleString()}</td>
              <td className="p-4 text-right text-red-700">{totals.opCredit.toLocaleString()}</td>
              <td className="p-4 text-right border-l text-green-700">{totals.perDebit.toLocaleString()}</td>
              <td className="p-4 text-right text-red-700">{totals.perCredit.toLocaleString()}</td>
              <td className="p-4 text-right border-l text-green-700">{totals.endDebit.toLocaleString()}</td>
              <td className="p-4 text-right text-red-700">{totals.endCredit.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
